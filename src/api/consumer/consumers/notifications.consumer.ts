import { AsyncApiPub, AsyncApiSub } from 'nestjs-asyncapi';
import { firstValueFrom, timeout } from 'rxjs';
import { Controller, Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  ClientKafka,
  ClientRedis,
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
  Transport,
} from '@nestjs/microservices';

import { config } from '@common/configs';

import { getChannelName } from '../../generic/util';

@Controller()
export class NotificationsConsumer implements OnModuleInit {
  readonly logger = new Logger(NotificationsConsumer.name);

  constructor(
    @Inject('NOTIFICATIONS_KAFKA_CLIENT')
    private readonly kafkaClient: ClientKafka,
    @Inject('NOTIFICATIONS_REDIS_CLIENT')
    private readonly redisClient: ClientRedis,
  ) {}

  async onModuleInit(): Promise<void> {
    this.kafkaClient.subscribeToResponseOf(
      config.get('kafka.notificationTopicName'),
    );
  }

  @AsyncApiPub({
    tags: [{ name: 'kafka' }, { name: 'private' }],
    channel: `kafka/${config.get('kafka.notificationTopicName')}`,
    bindings: {
      kafka: {
        groupId: {
          default: `${config.get('kafka.consumer.groupId')}-server`,
        },
        clientId: {
          default: `${config.get('kafka.clientId')}-server-[uuid]`,
        },
      },
    },
    message: {
      payload: Object,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore : missing in libs types, but it works
      bindings: {
        kafka: {
          key: {
            description: 'userId',
            nullable: false,
            type: 'string',
            minLength: 24,
            maxLength: 24,
            examples: ['642d59b11d28f972f42f321a'],
          },
        },
      },
    },
  })
  @AsyncApiSub({
    tags: [{ name: 'redis-notification' }, { name: 'private' }],
    channel: `redis/user.[user_id]`,
    message: {
      payload: Object,
    },
  })
  @EventPattern(config.get('kafka.notificationTopicName'), Transport.KAFKA)
  async handleUserNotification(
    @Payload() record: Record<string, unknown>,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    this.logger.debug(
      `Notification received for processing: ${JSON.stringify(record)}`,
    );

    const message = context.getMessage();
    const userId = message.key ? message.key.toString() : null;

    if (!userId) {
      this.logger.warn(
        `Message with bad key "${message.key}" received: ${JSON.stringify(
          record,
        )}`,
      );

      return;
    }

    this.logger.debug('Message for redis.emit:', {
      userId,
      channel: getChannelName(userId),
      record,
      partition: context.getPartition(),
    });

    await firstValueFrom(
      this.redisClient
        .emit(getChannelName(userId), record)
        .pipe(timeout(config.get('redis.emitTimeout'))),
    );
  }
}
