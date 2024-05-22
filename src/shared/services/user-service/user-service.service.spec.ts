/* eslint-disable @typescript-eslint/ban-ts-comment */

import { HttpService } from '@nestjs/axios';
import { NotFoundException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthStorageService } from '../storage/auth-storage.service';

import { UserCreationStrategy, UserDto, UserRole } from './dto';
import { WalletProvider } from './dto/user-wallet.dto';
import { UserServiceService } from './user-service.service';

describe('UserServiceService', () => {
  let userServiceService: UserServiceService;
  const httpService = {
    axiosRef: {
      get: jest.fn().mockResolvedValue({ data: {} }),
    },
  };

  const mockUser: UserDto = {
    id: 'test123',
    email: 'test@gmail.com',
    activeWallet: { address: '0x0', provider: WalletProvider.META_MASK },
    wallets: [{ address: '0x0', provider: WalletProvider.META_MASK }],
    username: 'username',
    firstName: 'Name',
    lastName: 'Test',
    apiKey: '12345',
    createdBy: UserCreationStrategy.ADDRESS,
    roles: [UserRole.ADMIN],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'TESTSECRET',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [UserServiceService],
      providers: [
        UserServiceService,
        AuthStorageService,
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    userServiceService = moduleRef.get(UserServiceService);
  });

  it('should be defined', () => {
    expect(userServiceService).toBeDefined();
  });

  describe('getUserDetails', () => {
    it('should return user by id', async () => {
      jest
        .spyOn(httpService.axiosRef, 'get')
        .mockImplementationOnce(() => Promise.resolve({ data: mockUser }));

      const result = await userServiceService.getUserDetails('test123');
      expect(result).toEqual(mockUser);
    });

    it('should return NotFoundException with wrong api key', async () => {
      jest
        .spyOn(httpService.axiosRef, 'get')
        .mockImplementationOnce(() => Promise.reject(new NotFoundException()));
      try {
        await userServiceService.getUserDetails('test1234');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });
});
