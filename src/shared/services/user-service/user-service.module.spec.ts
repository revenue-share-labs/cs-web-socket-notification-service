/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-explicit-any */

import { HttpService } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { UserServiceModule } from './user-service.module';

describe('UserServiceModule', () => {
  it('should compile the module', async () => {
    const userServiceModule: UserServiceModule = await Test.createTestingModule(
      {
        imports: [
          JwtModule.register({
            secret: 'TESTSECRET',
            signOptions: { expiresIn: '1d' },
          }),
          UserServiceModule,
        ],
      },
    )
      .overrideProvider(HttpService)
      .useValue({
        axiosRef: {
          get: jest.fn().mockResolvedValue({ data: {} }),
        },
      })
      .compile();

    expect(userServiceModule).toBeDefined();
  });
});
