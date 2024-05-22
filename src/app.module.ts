import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from '@common/auth/auth.module';
import { HealthModule } from '@services/health/health.module';
import { TasksModule } from '@services/tasks/tasks.module';
import { UserServiceModule } from '@services/user-service/user-service.module';

import { ConsumerModule } from './api/consumer/consumer.module';
import { NotificationsModule } from './api/notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UserServiceModule,
    TasksModule,
    HealthModule,
    ConsumerModule,
    NotificationsModule,
  ],
})
export class AppModule {}
