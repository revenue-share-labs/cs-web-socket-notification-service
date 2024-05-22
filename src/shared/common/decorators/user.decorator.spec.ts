import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { User } from './user.decorator';

describe('UserDecorator', () => {
  // eslint-disable-next-line @typescript-eslint/ban-types,@typescript-eslint/explicit-function-return-type
  function getParamDecoratorFactory(decorator: Function) {
    class Test {
      // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
      public test(@decorator() value: unknown) {}
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');

    return args[Object.keys(args)[0]].factory;
  }

  it('should return a user from request', () => {
    const mockUser = {
      id: '123',
    };
    const host = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        user: mockUser,
      }),
    };

    const factory = getParamDecoratorFactory(User);
    const result = factory(null, host);
    expect(result).toBe(mockUser);
  });
});
