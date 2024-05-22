import { Module } from '@nestjs/common';
import {
  ClientsModule,
  KafkaOptions,
  RedisOptions,
  Transport,
} from '@nestjs/microservices';

import { config } from '@common/configs';

import { NotificationsConsumer } from './consumers/notifications.consumer';
import { ApacheAvroDeserializer } from './deserializers/apache-avro.deserializer';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATIONS_KAFKA_CLIENT',
        useFactory: (): KafkaOptions => ({
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
        }),
      },
      {
        name: 'NOTIFICATIONS_REDIS_CLIENT',
        useFactory: (): RedisOptions => ({
          transport: Transport.REDIS,
          options: {
            host: config.get('redis.host'),
            port: config.get('redis.port'),
          },
        }),
      },
    ]),
  ],
  controllers: [NotificationsConsumer],
})
export class ConsumerModule {}
