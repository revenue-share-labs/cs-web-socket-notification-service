import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';

import { TasksService } from './tasks.service';

@Module({
  imports: [StorageModule],
  providers: [TasksService],
  exports: [],
})
export class TasksModule {}
