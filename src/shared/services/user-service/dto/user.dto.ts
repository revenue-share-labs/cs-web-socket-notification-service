import { UserWallet } from './user-wallet.dto';

export enum UserCreationStrategy {
  'ADDRESS' = 'ADDRESS',
  'EMAIL' = 'EMAIL',
}

export enum UserRole {
  'CUSTOMER' = 'CUSTOMER',
  'ADMIN' = 'ADMIN',
  'PARTNER' = 'PARTNER',
}

export class UserDto {
  readonly id: string;
  readonly email?: string;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly wallets: UserWallet[];
  readonly createdBy: UserCreationStrategy;
  readonly activeWallet?: UserWallet;
  readonly roles: UserRole[];
  readonly apiKey?: string;
}
