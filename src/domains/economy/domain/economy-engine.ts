import type { EconomyTransactionResult, WalletState } from '../types';

export function createInitialWallet(): WalletState {
  return {
    amberCoins: 250,
    totalEarned: 250,
    totalSpent: 0
  };
}

export function earnCoins(wallet: WalletState, amount: number): EconomyTransactionResult {
  const safeAmount = Math.floor(amount);
  if (safeAmount <= 0) {
    return {
      success: false,
      wallet,
      reason: 'Valor de ganho deve ser positivo.'
    };
  }

  return {
    success: true,
    wallet: {
      amberCoins: wallet.amberCoins + safeAmount,
      totalEarned: wallet.totalEarned + safeAmount,
      totalSpent: wallet.totalSpent
    }
  };
}

export function spendCoins(wallet: WalletState, amount: number): EconomyTransactionResult {
  const safeAmount = Math.floor(amount);
  if (safeAmount <= 0) {
    return {
      success: false,
      wallet,
      reason: 'Valor de compra deve ser positivo.'
    };
  }

  if (wallet.amberCoins < safeAmount) {
    return {
      success: false,
      wallet,
      reason: 'Moedas Âmbar insuficientes.'
    };
  }

  return {
    success: true,
    wallet: {
      amberCoins: wallet.amberCoins - safeAmount,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent + safeAmount
    }
  };
}

