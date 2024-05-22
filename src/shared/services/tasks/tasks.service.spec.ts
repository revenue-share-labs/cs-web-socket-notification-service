/* eslint-disable @typescript-eslint/ban-ts-comment */

import { HttpService } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthStorageService } from '../storage/auth-storage.service';

import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let tasksService: TasksService;
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
      controllers: [TasksService],
      providers: [
        TasksService,
        AuthStorageService,
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    tasksService = moduleRef.get(TasksService);
    authStorageService = moduleRef.get(AuthStorageService);
  });

  it('should be defined', () => {
    expect(tasksService).toBeDefined();
  });

  describe('handleCron', () => {
    it('should handle get service token', async () => {
      jest
        .spyOn(httpService.axiosRef, 'get')
        .mockImplementationOnce(() =>
          Promise.resolve({ data: { token: '123' } }),
        );
      await tasksService.handleCron();
      expect(authStorageService.serviceJwt).toEqual('123');
    });
  });
});
