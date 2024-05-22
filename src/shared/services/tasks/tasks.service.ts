import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { config } from '@common/configs';

import { AuthStorageService } from '../storage/auth-storage.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private authStorageService: AuthStorageService) {}

  @Interval(config.get('services.authUpdateEveryMin') * 60 * 1000)
  async handleCron(): Promise<void> {
    this.logger.log('Launching handleCron');
    await this.authStorageService.getServiceJwt();
  }
}
