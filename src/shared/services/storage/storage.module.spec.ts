import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';

import { StorageModule } from './storage.module';

describe('StorageModule', () => {
  it('should compile the module', async () => {
    const storageModule: StorageModule = await Test.createTestingModule({
      imports: [StorageModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        axiosRef: {
          get: jest.fn().mockResolvedValue({ data: {} }),
        },
      })
      .compile();

    expect(storageModule).toBeDefined();
  });
});
