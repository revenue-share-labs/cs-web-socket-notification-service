import { Redis } from 'ioredis';
import { AsyncApiPub, AsyncApiSub } from 'nestjs-asyncapi';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientRedis } from '@nestjs/microservices';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { JwtStrategy } from '@common/auth/jwt.strategy';
import { config } from '@common/configs';
import { UserDto } from '@services/user-service/dto';

import { getChannelName } from '../generic/util';

type ClientInfo = {
  room: string; // same as channel name
};

@WebSocketGateway({
  transports: ['websocket'],
  serveClient: true,
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  public server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly redis: Redis;

  private readonly clients: Record<string, ClientInfo> = {};
  private readonly rooms: Record<string, string[]> = {};

  constructor(
    @Inject('NOTIFICATIONS_REDIS_CLIENT')
    private readonly redisClient: ClientRedis,
    private readonly jwt: JwtStrategy,
  ) {
    this.redis = this.redisClient.createClient();
  }

  async handleConnection(client: Socket): Promise<void> {
    // XXX: dirty hack to use the same passport jwt auth for websocket
    const user: UserDto | null = await new Promise(async (resolve) => {
      const reqMock = {
        headers: {
          ...(client.handshake.auth?.token
            ? { authorization: `Bearer ${client.handshake.auth?.token}` }
            : {}),
          ...client.handshake.headers,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.jwt.fail = (err: Error) => {
        this.logger.debug('jwt auth error:', err);
        resolve(null);
      };

      this.jwt.success = (resultUser: UserDto, info) => {
        this.logger.debug('auth user:', resultUser, info);
        resolve(resultUser);
      };

      // check client auth
      await this.jwt.authenticate(reqMock, {});
    });

    if (!user?.id) {
      this.logger.debug('WebSocket connection failed:', {
        id: client.id,
        auth: client.handshake.auth,
        headers: client.handshake.headers,
        user,
      });

      // drop unauthorized connection
      client.disconnect(true);

      return;
    }

    const roomName = getChannelName(user.id);

    // check if it's new room
    if (!this.rooms[roomName]) {
      this.rooms[roomName] = [];

      // subscribe to channel
      await this.redis.subscribe(roomName);
    }

    this.clients[client.id] = {
      room: roomName,
    };

    // remember the room
    this.rooms[roomName].push(client.id);

    // join client to room
    await client.join(roomName);

    this.logger.debug('New WebSocket connection:', {
      id: client.id,
      roomName,
      user,
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const clientEntry = this.clients[client.id];

    if (!clientEntry) {
      return;
    }

    if (!clientEntry.room || !this.rooms[clientEntry.room]?.length) {
      return;
    }

    // remove from room
    this.rooms[clientEntry.room] = this.rooms[clientEntry.room].filter(
      (id) => id !== client.id,
    );

    // check if room is empty
    if (!this.rooms[clientEntry.room].length) {
      // delete room
      delete this.rooms[clientEntry.room];

      // unsubscribe from channel
      await this.redis.unsubscribe(clientEntry.room);
    }

    await client.leave(clientEntry.room);

    // remove from clients
    delete this.clients[client.id];

    this.logger.debug('WebSocket connection closed:', {
      id: client.id,
      roomName: clientEntry.room,
    });
  }

  @AsyncApiSub({
    tags: [{ name: 'ws-notification' }, { name: 'public' }],
    channel: `ws/${config.get('base.wsEventName')}`,
    message: {
      payload: Object,
    },
  })
  async onNewMessage(channel: string, message: string): Promise<void> {
    this.logger.debug(
      `Message from "${channel}" channel received to ws emit: ${message}`,
    );

    // reformat message
    let msg: { pattern: string; data: unknown };
    try {
      msg = JSON.parse(message);
    } catch (err) {
      this.logger.warn(`Got bad message: ${message}`);

      return;
    }

    // emit message to room (=channel)
    this.server.in(channel).emit(config.get('base.wsEventName'), msg.data);
  }

  @AsyncApiPub({
    tags: [{ name: 'redis-notification' }, { name: 'private' }],
    channel: 'redis/user.[user_id]',
    message: {
      payload: Object,
    },
  })
  async onModuleInit(): Promise<void> {
    this.redis.on('message', this.onNewMessage.bind(this));
  }
}
