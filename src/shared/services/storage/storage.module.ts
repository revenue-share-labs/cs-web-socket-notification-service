import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { config } from '@common/configs';

import { AuthStorageService } from './auth-storage.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: config.get('services.authUrl'),
      timeout: config.get('services.axiosTimeout'),
    }),
  ],
  providers: [AuthStorageService],
  exports: [AuthStorageService],
})
export class StorageModule {}
