import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';

import { UserServiceModule } from '@services/user-service/user-service.module';

import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('should compile the module', async () => {
    const authModule: AuthModule = await Test.createTestingModule({
      imports: [AuthModule, UserServiceModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        axiosRef: {
          get: jest.fn().mockResolvedValue({ data: {} }),
        },
      })
      .compile();

    expect(authModule).toBeDefined();
  });
});
