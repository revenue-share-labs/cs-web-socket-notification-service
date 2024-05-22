export enum WalletProvider {
  'META_MASK' = 'META_MASK',
  'COINBASE_WALLET' = 'COINBASE_WALLET',
  'WALLET_CONNECT' = 'WALLET_CONNECT',
}

export class UserWallet {
  readonly address: string;
  readonly provider: WalletProvider;
}
