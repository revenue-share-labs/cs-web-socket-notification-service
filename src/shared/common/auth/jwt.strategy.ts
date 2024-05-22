import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { config } from '@common/configs';
import { UserDto } from '@services/user-service/dto';
import { UserServiceService } from '@services/user-service/user-service.service';

import { TokenPayloadDto } from './dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly userService: UserServiceService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('services.jwtSecret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: TokenPayloadDto): Promise<UserDto | null> {
    try {
      const user = await this.userService.getUserDetails(payload.sub);

      return user;
    } catch (err) {
      this.logger.error(err);

      return null;
    }
  }
}
