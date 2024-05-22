import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { KafkaOptions, RedisOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { config } from '@common/configs';

import { ApacheAvroDeserializer } from './api/consumer/deserializers/apache-avro.deserializer';
import { SocketAdapter } from './api/notifications/socket.adapter';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const wsAdapter = new SocketAdapter(app);

  // Kafka
  app.connectMicroservice<KafkaOptions>({
    transport: Transport.KAFKA,
    options: {
      consumer: {
        groupId: config.get('kafka.consumer.groupId'),
        allowAutoTopicCreation: config.get('kafka.consumer.allowTopicCreation'),
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

  // Cors
  if (config.get('cors.enabled')) {
    app.enableCors({
      origin: config.get('cors.origins'),
      methods: config.get('cors.methods'),
      credentials: config.get('cors.credentials'),
    });

    wsAdapter.setCors({
      origin: config.get('cors.origins') || '*',
      methods: config.get('cors.methods') || '*',
      credentials: config.get('cors.credentials'),
    });
  }

  // Swagger Api
  if (config.get('docs.enabled')) {
    const options = new DocumentBuilder()
      .setTitle(config.get('docs.title'))
      .setDescription(config.get('docs.description'))
      .setVersion(config.get('docs.version'))
      .build();
    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup(config.get('docs.swaggerPath'), app, document);

    const asyncApiOptions = new AsyncApiDocumentBuilder()
      .setTitle(config.get('docs.title'))
      .setDescription(config.get('docs.description'))
      .setVersion(config.get('docs.version'))
      .setDefaultContentType('application/json')
      .addSecurity('token', {
        type: 'http',
        scheme: 'API token',
        description: 'Specify `token` in auth field of Socket.IO client',
      })
      .addServer('ws-notification', {
        url: config.get('docs.wsExternalUrl'),
        protocol: 'socket.io',
        security: [
          {
            token: [],
          },
        ],
      })
      .addServer('redis-notification', {
        url: `${config.get('redis.host')}:${config.get('redis.port')}`,
        protocol: 'Redis',
      })
      .addServer('kafka', {
        url: config.get('kafka.brokers').join(', '),
        protocol: 'Kafka',
        bindings: {
          kafka: {
            schemaRegistryUrl: config.get('kafka.schemaRegistryUrl'),
          },
        },
      })
      .build();
    const asyncapiDocument = await AsyncApiModule.createDocument(
      app,
      asyncApiOptions,
    );
    await AsyncApiModule.setup(
      config.get('docs.asyncapiPath'),
      app,
      asyncapiDocument,
      {
        sidebarOrganization: 'byTagsNoRoot',
        singleFile: true,
      },
    );
  }

  app.useWebSocketAdapter(wsAdapter);

  // Default
  app.setGlobalPrefix('/api/v1/notifications', { exclude: ['health'] });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  await app.startAllMicroservices();
  await app.listen(config.get('base.port'));
}

bootstrap();
