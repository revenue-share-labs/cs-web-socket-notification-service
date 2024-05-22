import { mockDeep } from 'jest-mock-extended';
import { sign } from 'jsonwebtoken';
import { Kafka, Producer } from 'kafkajs';
import { io, Socket } from 'socket.io-client';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
} from 'testcontainers';
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';
import { RegisteredSchema } from '@kafkajs/confluent-schema-registry/dist/SchemaRegistry';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { KafkaOptions, RedisOptions, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';

import { config } from '@common/configs';
import { AuthStorageService } from '@services/storage/auth-storage.service';
import { UserDto } from '@services/user-service/dto';
import { UserServiceService } from '@services/user-service/user-service.service';

import { ApacheAvroDeserializer } from '../src/api/consumer/deserializers/apache-avro.deserializer';
import { SocketAdapter } from '../src/api/notifications/socket.adapter';
import { AppModule } from '../src/app.module';

type WsEvent = {
  message: string;
};

describe('WebSocket Notification (e2e)', () => {
  const zookeeperInnerPort = 2181;
  let kafkaInnerPort = 39092;
  const kafkaInnerExternalPort = 9092;
  let kafkaExternalPort: number;
  const registryInnerPort = 8081;
  const redisInnerPort = 6379;
  const jwtSecret = 'sz99sz99sz';
  const kafkaTopicName = config.get('kafka.notificationTopicName');
  const wsEventName = config.get('base.wsEventName');

  let app1: INestApplication;
  let app2: INestApplication;
  let producer: Producer;

  let schemaRegistry: SchemaRegistry;
  let registeredSchemaId: RegisteredSchema;
  const newNotification = async (
    userId: string,
    message: string,
    partition: number,
  ) => {
    await producer.send({
      topic: kafkaTopicName,
      messages: [
        {
          key: userId,
          value: await schemaRegistry.encode(registeredSchemaId.id, {
            message,
          }),
          partition,
        },
      ],
    });
  };

  const userId1 = 'user1';
  const userId2 = 'user2';
  const user1 = { id: userId1 } as UserDto;
  const user2 = { id: userId2 } as UserDto;
  const token1 = sign(
    {
      sub: userId1,
      iat: Math.floor(Date.now() / 1000),
    },
    jwtSecret,
    {
      expiresIn: '1d',
    },
  );
  const token2 = sign(
    {
      sub: userId2,
      iat: Math.floor(Date.now() / 1000),
    },
    jwtSecret,
    {
      expiresIn: '1d',
    },
  );

  let network: StartedNetwork;
  let zookeeperContainer: StartedTestContainer;
  let kafkaContainer: StartedTestContainer;
  let kafkaSchemaRegistryContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;

  async function createApp(port: number) {
    config.set('base.port', port);

    // auth-service mock service
    const authStorageServiceMock = mockDeep<AuthStorageService>({
      async getServiceJwt(): Promise<void> {
        this.serviceJwt = token1;
      },
    });

    // user-service mock service
    const userServiceServiceMock = mockDeep<UserServiceService>({
      async getUserDetails(id: string): Promise<UserDto> {
        switch (id) {
          case userId1:
            return user1;

          case userId2:
            return user2;

          default:
            throw new Error('unexpected user');
        }
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthStorageService)
      .useValue(authStorageServiceMock)
      .overrideProvider(UserServiceService)
      .useValue(userServiceServiceMock)
      .compile();

    const app = module.createNestApplication();

    // Kafka
    app.connectMicroservice<KafkaOptions>({
      transport: Transport.KAFKA,
      options: {
        consumer: {
          groupId: config.get('kafka.consumer.groupId'),
          allowAutoTopicCreation: config.get(
            'kafka.consumer.allowTopicCreation',
          ),
        },
        client: {
          ssl: config.get('kafka.sslEnabled'),
          clientId: config.get('kafka.clientId'),
          brokers: config.get('kafka.brokers'),
        },
        deserializer: new ApacheAvroDeserializer(
          config.get('kafka.schemaRegistryUrl'),
        ),
      },
    });

    // Redis
    app.connectMicroservice<RedisOptions>({
      transport: Transport.REDIS,
      options: {
        host: config.get('redis.host'),
        port: config.get('redis.port'),
      },
    });
    app.useWebSocketAdapter(new SocketAdapter(app));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    await app.startAllMicroservices();
    await app.listen(port);

    return app;
  }
  async function createClient(url: string, token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const client = io(url, {
        transports: ['websocket'],
        auth: { token },
      });

      client
        .once('connect', () => {
          resolve(client);
        })
        .once('connect_error', () => {
          reject(new Error('connection failed'));
        });
    });
  }
  async function getMessage(client: Socket): Promise<WsEvent> {
    return new Promise((resolve) => {
      client.on(wsEventName, (msg) => {
        resolve(msg);
      });
    });
  }

  beforeAll(async () => {
    // run Kafka container
    network = await new Network().start();

    const zookeeperHost = 'zookeeper';
    zookeeperContainer = await new GenericContainer(
      'confluentinc/cp-zookeeper:7.3.2',
    )
      .withNetwork(network)
      .withNetworkAliases(zookeeperHost)
      .withEnvironment({
        ZOOKEEPER_CLIENT_PORT: `${zookeeperInnerPort}`,
      })
      .start();

    const kafkaHost = 'kafka';
    // first launch to find a random external port
    const tmpContainer = await new GenericContainer(
      'confluentinc/cp-kafka:7.3.2',
    )
      .withNetwork(network)
      .withNetworkAliases(kafkaHost)
      .withEnvironment({
        KAFKA_ADVERTISED_LISTENERS: `INNER://${kafkaHost}:${kafkaInnerPort},EXTERNAL://localhost:${kafkaInnerExternalPort}`,
        KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
          'INNER:PLAINTEXT,EXTERNAL:PLAINTEXT',
        KAFKA_INTER_BROKER_LISTENER_NAME: 'INNER',
        KAFKA_ZOOKEEPER_CONNECT: `${zookeeperHost}:${zookeeperInnerPort}`,
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
      })
      .withExposedPorts(kafkaInnerExternalPort)
      .start();
    kafkaExternalPort = tmpContainer.getMappedPort(kafkaInnerExternalPort);
    await tmpContainer.stop({ removeVolumes: true });

    // second launch to make host and container ports are the same (otherwise it won't work)
    kafkaInnerPort++;
    kafkaContainer = await new GenericContainer('confluentinc/cp-kafka:7.3.2')
      .withNetwork(network)
      .withNetworkAliases(kafkaHost)
      .withEnvironment({
        KAFKA_ADVERTISED_LISTENERS: `INNER://${kafkaHost}:${kafkaInnerPort},EXTERNAL://localhost:${kafkaExternalPort}`,
        KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
          'INNER:PLAINTEXT,EXTERNAL:PLAINTEXT',
        KAFKA_INTER_BROKER_LISTENER_NAME: 'INNER',
        KAFKA_ZOOKEEPER_CONNECT: `${zookeeperHost}:${zookeeperInnerPort}`,
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
      })
      .withExposedPorts({
        host: kafkaExternalPort,
        container: kafkaExternalPort,
      })
      .start();

    const registryHost = 'kafka-schema-registry';
    kafkaSchemaRegistryContainer = await new GenericContainer(
      'confluentinc/cp-schema-registry:7.3.2',
    )
      .withNetwork(network)
      .withNetworkAliases(registryHost)
      .withEnvironment({
        SCHEMA_REGISTRY_HOST_NAME: registryHost,
        SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: `PLAINTEXT://${kafkaHost}:${kafkaInnerPort}`,
        SCHEMA_REGISTRY_LISTENERS: `http://0.0.0.0:${registryInnerPort}`,
      })
      .withExposedPorts(registryInnerPort)
      .start();

    // run Redis container
    redisContainer = await new GenericContainer('redis')
      .withExposedPorts(redisInnerPort)
      .start();

    const kafkaPort = kafkaExternalPort;
    const registryPort =
      kafkaSchemaRegistryContainer.getMappedPort(registryInnerPort);
    const redisPort = redisContainer.getMappedPort(redisInnerPort);

    // set envs
    config.set('services.jwtSecret', jwtSecret);
    config.set('kafka.brokers', [`localhost:${kafkaPort}`]);
    config.set('kafka.schemaRegistryUrl', `http://localhost:${registryPort}`);
    config.set('redis.port', redisPort);

    // setup kafka schema registry
    schemaRegistry = new SchemaRegistry({
      host: `http://localhost:${registryPort}`,
    });
    registeredSchemaId = await schemaRegistry.register({
      type: SchemaType.AVRO,
      schema: `
        {
          "type": "record",
          "name": "SampleMessage",
          "namespace": "xla.contracts",
          "fields": [
            {
              "name": "message",
              "type": "string"
            }
          ],
          "version": "1"
        }`,
    });

    // setup kafka producer
    const kafka = new Kafka({
      clientId: 'notification-service-mock',
      ssl: config.get('kafka.sslEnabled'),
      brokers: config.get('kafka.brokers'),
    });

    // setup kafka topic
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    if (kafkaTopicName in topics) {
      await admin.deleteTopics({
        topics: [kafkaTopicName],
      });
    }
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: kafkaTopicName,
          numPartitions: 2,
        },
      ],
    });
    await admin.disconnect();

    // setup producer
    process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
    producer = kafka.producer();
    await producer.connect();

    // run 2 instances of web-socket-notification-service
    config.set('kafka.clientId', 'web-socket-notification-service-1');
    app1 = await createApp(3040);

    config.set('kafka.clientId', 'web-socket-notification-service-2');
    app2 = await createApp(3041);
  }, 60 * 1000);

  afterAll(async () => {
    await Promise.all([app1.close(), app2.close(), producer.disconnect()]);
    await kafkaSchemaRegistryContainer.stop({ removeVolumes: true });
    await kafkaContainer.stop({ removeVolumes: true });
    await zookeeperContainer.stop({ removeVolumes: true });
    await network.stop();
    await redisContainer.stop({ removeVolumes: true });
  }, 30000);

  describe('client connected to instance that got partition of the same user', () => {
    let client1: Socket;
    let client2: Socket;

    beforeAll(async () => {
      client1 = await createClient(await app1.getUrl(), token1);
      client2 = await createClient(await app2.getUrl(), token2);
    });

    afterAll(() => {
      client1.disconnect();
      client2.disconnect();
    });

    it('each client receives its message', async () => {
      const result1 = getMessage(client1);
      const result2 = getMessage(client2);

      await newNotification(userId1, 'sample1', 0);
      await newNotification(userId2, 'sample2', 1);

      const [response1, response2] = await Promise.all([result1, result2]);

      expect(response1).toEqual({ message: 'sample1' });
      expect(response2).toEqual({ message: 'sample2' });
    });
  });

  describe('client connected to instance that got another user partition', () => {
    let client1: Socket;
    let client2: Socket;

    beforeAll(async () => {
      client1 = await createClient(await app2.getUrl(), token1);
      client2 = await createClient(await app1.getUrl(), token2);
    });

    afterAll(() => {
      client1.disconnect();
      client2.disconnect();
    });

    it('each client receives its message', async () => {
      const result1 = getMessage(client1);
      const result2 = getMessage(client2);

      await newNotification(userId1, 'sample1', 0);
      await newNotification(userId2, 'sample2', 1);

      const [response1, response2] = await Promise.all([result1, result2]);

      expect(response1).toEqual({ message: 'sample1' });
      expect(response2).toEqual({ message: 'sample2' });
    });
  });

  describe('clients connected to both instances', () => {
    let client1_1: Socket;
    let client1_2: Socket;
    let client2_1: Socket;
    let client2_2: Socket;

    beforeAll(async () => {
      client1_1 = await createClient(await app1.getUrl(), token1);
      client1_2 = await createClient(await app2.getUrl(), token1);
      client2_1 = await createClient(await app1.getUrl(), token2);
      client2_2 = await createClient(await app2.getUrl(), token2);
    });

    afterAll(() => {
      client1_1.disconnect();
      client1_2.disconnect();
      client2_1.disconnect();
      client2_2.disconnect();
    });

    it('each client receives message of its user', async () => {
      const result1_1 = getMessage(client1_1);
      const result1_2 = getMessage(client1_2);
      const result2_1 = getMessage(client2_1);
      const result2_2 = getMessage(client2_2);

      await newNotification(userId1, 'sample1', 0);
      await newNotification(userId2, 'sample2', 1);

      const [response1_1, response1_2, response2_1, response2_2] =
        await Promise.all([result1_1, result1_2, result2_1, result2_2]);

      expect(response1_1).toEqual({ message: 'sample1' });
      expect(response1_2).toEqual({ message: 'sample1' });
      expect(response2_1).toEqual({ message: 'sample2' });
      expect(response2_2).toEqual({ message: 'sample2' });
    });
  });
});
