import { describe, it, expect } from 'vitest';
import {
  createInitialWallet,
  earnCoins,
  spendCoins
} from '../domain/economy-engine';

describe('economy domain engine', () => {
  it('creates initial wallet and processes coin earnings and spending', () => {
    const wallet = createInitialWallet();
    expect(wallet.amberCoins).toBe(250);

    const zeroEarn = earnCoins(wallet, -10);
    expect(zeroEarn.wallet).toEqual(wallet);

    const earned = earnCoins(wallet, 50);
    expect(earned.success).toBe(true);
    expect(earned.wallet.amberCoins).toBe(300);
    expect(earned.wallet.totalEarned).toBe(300);

    const invalidSpend = spendCoins(earned.wallet, 0);
    expect(invalidSpend.success).toBe(false);

    const tooExpensive = spendCoins(earned.wallet, 500);
    expect(tooExpensive.success).toBe(false);
    expect(tooExpensive.reason).toContain('Moedas Âmbar insuficientes');

    const spent = spendCoins(earned.wallet, 100);
    expect(spent.success).toBe(true);
    expect(spent.wallet.amberCoins).toBe(200);
    expect(spent.wallet.totalSpent).toBe(100);
  });
});

