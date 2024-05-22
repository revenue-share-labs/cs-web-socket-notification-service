/* eslint-disable @typescript-eslint/ban-ts-comment */

import { mockDeep } from 'jest-mock-extended';
import {
  HealthCheckResult,
  HealthIndicatorResult,
  HttpHealthIndicator,
  MicroserviceHealthIndicator,
  TerminusModule,
  TimeoutError,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;
  const http = mockDeep<HttpHealthIndicator>();
  const micro = mockDeep<MicroserviceHealthIndicator>();

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
    })
      .overrideProvider(HttpHealthIndicator)
      .useValue(http)
      .overrideProvider(MicroserviceHealthIndicator)
      .useValue(micro)
      .compile();

    healthController = moduleRef.get(HealthController);
  });

  it('should be defined', () => {
    expect(healthController).toBeDefined();
  });

  describe('check', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should handles success checks', async () => {
      const httpPing = jest
        .spyOn(http, 'pingCheck')
        // @ts-ignore
        .mockImplementation(async (key: string): Promise<HealthCheckResult> => {
          return {
            status: 'ok',
            details: {
              [key]: {
                status: 'up',
              },
            },
          };
        });
      const microPing = jest
        .spyOn(micro, 'pingCheck')
        // @ts-ignore
        .mockImplementation(async (key: string): Promise<HealthCheckResult> => {
          return {
            status: 'ok',
            details: {
              [key]: {
                status: 'up',
              },
            },
          };
        });

      expect(await healthController.check()).toBeTruthy();

      expect(httpPing).toBeCalledTimes(2);
      expect(microPing).toBeCalledTimes(2);
    });

    it('should handles error checks', async () => {
      const httpPing = jest
        .spyOn(http, 'pingCheck')
        .mockImplementation(
          async (key: string): Promise<HealthIndicatorResult> => {
            throw new TimeoutError(1000, {
              [key]: {
                status: 'down',
                message: 'timeout',
              },
            });
          },
        );
      const microPing = jest
        .spyOn(micro, 'pingCheck')
        .mockImplementation(
          async (key: string): Promise<HealthIndicatorResult> => {
            throw new TimeoutError(1000, {
              [key]: {
                status: 'down',
                message: 'timeout',
              },
            });
          },
        );

      const result: HealthCheckResult = await healthController
        .check()
        .catch((data) => data.response);

      expect(httpPing).toBeCalledTimes(2);
      expect(microPing).toBeCalledTimes(2);

      await expect(healthController.check()).rejects.toHaveProperty(
        'response.status',
        'error',
      );

      expect(result).toHaveProperty('error.kafka.status', 'down');
      expect(result).toHaveProperty('error.kafka.message', 'timeout');
      expect(result).toHaveProperty('details.kafka.status', 'down');
      expect(result).toHaveProperty('details.kafka.message', 'timeout');

      expect(httpPing).toBeCalledTimes(4);
      expect(microPing).toBeCalledTimes(4);
    });
  });
});
