/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Redis } from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Server, Socket } from 'socket.io';
import { ClientRedis } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import { JwtStrategy } from '@common/auth/jwt.strategy';
import { config } from '@common/configs';

import { getChannelName } from '../generic/util';

import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let notificationsGateway: NotificationsGateway;
  let jwtStrategy: DeepMockProxy<JwtStrategy>;
  const redis = mockDeep<Redis>();

  const mockUserId = '123';
  const mockUser = { id: mockUserId };
  const mockChannel = getChannelName(mockUserId);
  const mockClient1 = {
    id: 'id1',
    handshake: {},
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  } as unknown as Socket;
  const mockClient2 = {
    id: 'id2',
    handshake: {},
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  } as unknown as Socket;
  const mockClient3 = {
    id: 'id3',
    handshake: {},
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  } as unknown as Socket;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: 'NOTIFICATIONS_REDIS_CLIENT',
          useClass: ClientRedis,
        },
        JwtStrategy,
        NotificationsGateway,
      ],
    })
      .overrideProvider('NOTIFICATIONS_REDIS_CLIENT')
      .useValue(
        mockDeep<ClientRedis>({
          createClient() {
            return redis;
          },
        }),
      )
      .overrideProvider(JwtStrategy)
      .useValue(mockDeep<JwtStrategy>())
      .compile();

    notificationsGateway = moduleRef.get(NotificationsGateway);
    jwtStrategy = moduleRef.get(JwtStrategy);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(notificationsGateway).toBeDefined();
  });

  describe('on ws connect', () => {
    it('should disconnect on no valid token provided', async () => {
      jest
        .spyOn(jwtStrategy, 'authenticate')
        .mockImplementation(() => jwtStrategy.success(null));
      const mock = jest.spyOn(mockClient1, 'disconnect');

      await notificationsGateway.handleConnection(mockClient1);

      expect(mock).toBeCalledTimes(1);
      expect(mock).toBeCalledWith(true);
    });

    it('should subscribe for redis channel (only) if it is new user connection', async () => {
      jest
        .spyOn(jwtStrategy, 'authenticate')
        .mockImplementation(() => jwtStrategy.success(mockUser));
      const mockJoin1 = jest.spyOn(mockClient1, 'join');
      const mockSubscribe = jest.spyOn(redis, 'subscribe');

      await notificationsGateway.handleConnection(mockClient1);

      expect(mockSubscribe).toBeCalledTimes(1);
      expect(mockSubscribe).toBeCalledWith(mockChannel);

      expect(mockJoin1).toBeCalledTimes(1);
      expect(mockJoin1).toBeCalledWith(mockChannel);

      const mockJoin2 = jest.spyOn(mockClient2, 'join');

      await notificationsGateway.handleConnection(mockClient2);

      expect(mockSubscribe).toBeCalledTimes(1);

      expect(mockJoin2).toBeCalledTimes(1);
      expect(mockJoin2).toBeCalledWith(mockChannel);
    });
  });

  describe('on ws disconnect', () => {
    it('should do nothing on unknown client', async () => {
      const mockLeave3 = jest.spyOn(mockClient3, 'leave');
      const mockUnsubscribe = jest.spyOn(redis, 'unsubscribe');

      await notificationsGateway.handleDisconnect(mockClient3);

      expect(mockLeave3).toBeCalledTimes(0);
      expect(mockUnsubscribe).toBeCalledTimes(0);
    });

    it('should unsubscribe from redis channel (only) if it was last client', async () => {
      const mockUnsubscribe = jest.spyOn(redis, 'unsubscribe');
      const mockLeave1 = jest.spyOn(mockClient1, 'leave');
      const mockLeave2 = jest.spyOn(mockClient2, 'leave');

      await notificationsGateway.handleDisconnect(mockClient1);

      expect(mockLeave1).toBeCalledTimes(1);
      expect(mockLeave1).toBeCalledWith(mockChannel);

      expect(mockUnsubscribe).toBeCalledTimes(0);

      await notificationsGateway.handleDisconnect(mockClient2);

      expect(mockLeave2).toBeCalledTimes(1);
      expect(mockLeave2).toBeCalledWith(mockChannel);

      expect(mockUnsubscribe).toBeCalledTimes(1);
      expect(mockUnsubscribe).toBeCalledWith(mockChannel);
    });
  });

  describe('on new notification', () => {
    it('should do nothing on bad message', async () => {
      notificationsGateway.server = {
        in: jest.fn(),
        emit: jest.fn(),
      } as unknown as Server;
      const mockIn = jest
        .spyOn(notificationsGateway.server, 'in')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => notificationsGateway.server as any);
      const mockEmit = jest.spyOn(notificationsGateway.server, 'emit');

      await notificationsGateway.onNewMessage(mockChannel, 'bad json');

      expect(mockIn).toBeCalledTimes(0);
      expect(mockEmit).toBeCalledTimes(0);
    });

    it('should emit notification in proper room', async () => {
      notificationsGateway.server = {
        in: jest.fn(),
        emit: jest.fn(),
      } as unknown as Server;
      const mockIn = jest
        .spyOn(notificationsGateway.server, 'in')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => notificationsGateway.server as any);
      const mockEmit = jest.spyOn(notificationsGateway.server, 'emit');

      await notificationsGateway.onNewMessage(
        mockChannel,
        '{"data":{"text":"sample"}}',
      );

      expect(mockIn).toBeCalledTimes(1);
      expect(mockIn).toBeCalledWith(mockChannel);

      expect(mockEmit).toBeCalledTimes(1);
      expect(mockEmit).toBeCalledWith(config.get('base.wsEventName'), {
        text: 'sample',
      });
    });
  });
});
