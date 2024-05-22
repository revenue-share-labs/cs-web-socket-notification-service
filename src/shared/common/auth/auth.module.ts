import { Global, Module } from '@nestjs/common';

import { JwtGuard } from './jwt.guard';
import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
  providers: [JwtStrategy, JwtGuard],
  exports: [JwtStrategy, JwtGuard],
})
export class AuthModule {}
