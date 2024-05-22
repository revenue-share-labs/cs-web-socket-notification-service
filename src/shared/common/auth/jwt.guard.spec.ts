import { mockDeep } from 'jest-mock-extended';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtGuard } from './jwt.guard';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true with auth', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
    const context = mockDeep<ExecutionContext>();
    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
  });
});
