import { Module } from '@nestjs/common';
import { ClientsModule, RedisOptions, Transport } from '@nestjs/microservices';

import { JwtStrategy } from '@common/auth/jwt.strategy';
import { config } from '@common/configs';

import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    ClientsModule.registerAsync([
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
  providers: [JwtStrategy, NotificationsGateway],
})
export class NotificationsModule {}
