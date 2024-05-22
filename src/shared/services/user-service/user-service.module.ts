import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';

import { config } from '@common/configs';

import { StorageModule } from '../storage/storage.module';

import { UserServiceService } from './user-service.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      baseURL: config.get('services.userUrl'),
      timeout: config.get('services.axiosTimeout'),
    }),
    StorageModule,
  ],
  exports: [UserServiceService],
  providers: [UserServiceService],
})
export class UserServiceModule {}
