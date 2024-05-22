import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';

import { TasksModule } from './tasks.module';

describe('TasksModule', () => {
  it('should compile the module', async () => {
    const tasksModule: TasksModule = await Test.createTestingModule({
      imports: [TasksModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        axiosRef: {
          get: jest.fn().mockResolvedValue({ data: {} }),
        },
      })
      .compile();

    expect(tasksModule).toBeDefined();
  });
});
