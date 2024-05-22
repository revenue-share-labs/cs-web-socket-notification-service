import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { config } from '@common/configs';

@Injectable()
export class AuthStorageService {
  private readonly logger = new Logger(AuthStorageService.name);

  constructor(private readonly httpService: HttpService) {
    this.getServiceJwt();
  }

  public serviceJwt = '';

  public async getServiceJwt(): Promise<void> {
    try {
      this.logger.log('Trying to updated serviceJwt');
      const { data } = await this.httpService.axiosRef.get(
        '/api/v1/auth/token/' + config.get('base.serviceName'),
      );
      this.serviceJwt = data.token;
      this.logger.log(`Service token was updated: ${this.serviceJwt}`);
    } catch (err) {
      this.logger.error('Unable to update service token', err);
      setTimeout(
        () => this.getServiceJwt(),
        config.get('services.authRetryDelay'),
      );
    }
  }
}
