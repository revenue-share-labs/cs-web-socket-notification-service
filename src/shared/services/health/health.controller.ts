import { Controller, Get } from '@nestjs/common';
import { KafkaOptions, RedisOptions, Transport } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';

import { config } from '@common/configs';
import { Public } from '@common/decorators';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private micro: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'auth-service',
          `${config.get('services.authUrl')}/health`,
          {
            timeout: 1000,
          },
        ),
      () =>
        this.http.pingCheck(
          'user-service',
          `${config.get('services.userUrl')}/health`,
          {
            timeout: 1000,
          },
        ),
      () =>
        this.micro.pingCheck<KafkaOptions>('kafka', {
          transport: Transport.KAFKA,
          options: {
            client: {
              ssl: config.get('kafka.sslEnabled'),
              clientId: config.get('kafka.clientId'),
              brokers: config.get('kafka.brokers'),
            },
            producerOnlyMode: true,
          },
          timeout: 1000,
        }),
      () =>
        this.micro.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: config.get('redis.host'),
            port: config.get('redis.port'),
          },
          timeout: 1000,
        }),
    ]);
  }
}
