import { TokenPayloadDto } from './token-payload.dto';

describe('TokenPayloadDto', () => {
  it('check fields of dto.', () => {
    const tokenPayloadDto: TokenPayloadDto = { sub: '1', type: 'internal' };
    expect({ sub: '1', type: 'internal' }).toEqual(tokenPayloadDto);
  });

  it('check instance of dto', () => {
    const tokenPayloadDto = new TokenPayloadDto();
    expect(tokenPayloadDto).toBeInstanceOf(TokenPayloadDto);
  });
});
