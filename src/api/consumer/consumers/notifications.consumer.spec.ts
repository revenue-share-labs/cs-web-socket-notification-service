/* eslint-disable @typescript-eslint/ban-ts-comment */

import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { from } from 'rxjs';
import { ClientKafka, ClientRedis, KafkaContext } from '@nestjs/microservices';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { Test } from '@nestjs/testing';

import { config } from '@common/configs';

import { getChannelName } from '../../generic/util';

import { NotificationsConsumer } from './notifications.consumer';

describe('NotificationsConsumer', () => {
  let notificationsConsumer: NotificationsConsumer;
  let kafkaClient: DeepMockProxy<ClientKafka>;
  let redisClient: DeepMockProxy<ClientRedis>;

  const mockMessage: Record<string, unknown> = { message: 'sample' };
  const mockUserId = '123';
  const mockChannel = getChannelName(mockUserId);

  const getContextWithKey = (key: string) =>
    ({
      getMessage() {
        return {
          key,
        } as unknown as KafkaMessage;
      },

      getPartition(): number {
        return 0;
      },
    } as KafkaContext);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsConsumer],
      providers: [
        {
          provide: 'NOTIFICATIONS_KAFKA_CLIENT',
          useClass: ClientKafka,
        },
        {
          provide: 'NOTIFICATIONS_REDIS_CLIENT',
          useClass: ClientRedis,
        },
      ],
    })
      .overrideProvider('NOTIFICATIONS_KAFKA_CLIENT')
      .useValue(mockDeep<ClientKafka>())
      .overrideProvider('NOTIFICATIONS_REDIS_CLIENT')
      .useValue(mockDeep<ClientRedis>())
      .compile();

    notificationsConsumer = moduleRef.get(NotificationsConsumer);
    kafkaClient = moduleRef.get('NOTIFICATIONS_KAFKA_CLIENT');
    redisClient = moduleRef.get('NOTIFICATIONS_REDIS_CLIENT');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(notificationsConsumer).toBeDefined();
  });

  it('should subscribeToResponseOf topic', () => {
    const spySubscribeToResponseOf = jest.spyOn(
      kafkaClient,
      'subscribeToResponseOf',
    );

    notificationsConsumer.onModuleInit();

    expect(spySubscribeToResponseOf).toBeCalledTimes(1);
    expect(spySubscribeToResponseOf.mock.calls[0][0]).toEqual(
      config.get('kafka.notificationTopicName'),
    );
  });

  it('should get userId from partition key of message', async () => {
    const mock = jest
      .spyOn(redisClient, 'emit')
      .mockImplementation(() => from(Promise.resolve()));

    await notificationsConsumer.handleUserNotification(
      mockMessage,
      getContextWithKey(mockUserId),
    );

    expect(mock).toBeCalledTimes(1);
    expect(mock).toBeCalledWith(mockChannel, mockMessage);
  });

  it('should throw error when no userId', async () => {
    const logWarn = jest
      .spyOn(notificationsConsumer.logger, 'warn')
      .mockImplementation();
    const emit = jest
      .spyOn(redisClient, 'emit')
      .mockImplementation(() => from(Promise.resolve()));

    await expect(
      notificationsConsumer.handleUserNotification(
        mockMessage,
        getContextWithKey(''),
      ),
    ).resolves.toBeUndefined();

    expect(logWarn).toBeCalledTimes(1);
    expect(logWarn).toHaveBeenLastCalledWith(
      `Message with bad key "" received: ${JSON.stringify(mockMessage)}`,
    );
    expect(emit).toBeCalledTimes(0);
  });
});
