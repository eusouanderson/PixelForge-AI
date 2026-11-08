export interface WalletState {
  readonly amberCoins: number;
  readonly totalEarned: number;
  readonly totalSpent: number;
}

export interface EconomyTransactionResult {
  readonly success: boolean;
  readonly wallet: WalletState;
  readonly reason?: string;
}

