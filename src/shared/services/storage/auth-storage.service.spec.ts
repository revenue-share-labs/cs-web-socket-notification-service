/* eslint-disable @typescript-eslint/ban-ts-comment */

import { HttpService } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthStorageService } from './auth-storage.service';

describe('AuthStorageService', () => {
  let authStorageService: AuthStorageService;
  const httpService = {
    axiosRef: {
      get: jest.fn().mockResolvedValue({ data: {} }),
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'TESTSECRET',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [AuthStorageService],
      providers: [
        AuthStorageService,
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    authStorageService = moduleRef.get(AuthStorageService);
  });

  it('should be defined', () => {
    expect(authStorageService).toBeDefined();
  });

  describe('getServiceJwt', () => {
    it('should set service token', async () => {
      jest
        .spyOn(httpService.axiosRef, 'get')
        .mockImplementationOnce(() =>
          Promise.resolve({ data: { token: '123' } }),
        );
      await authStorageService.getServiceJwt();
      expect(authStorageService.serviceJwt).toEqual('123');
    });
  });
});
