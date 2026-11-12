import { describe, it, expect } from 'vitest';
import type { WalletState } from '@/domains/economy/types';
import {
  DEFAULT_BATTLE_WAGER_CONFIG,
  processWagerDeduction,
  settleBattleOutcome,
  validateWagerAmount
} from '../domain/wager-settlement-engine';

describe('Wager Settlement Domain', () => {
  const initialWallet: WalletState = {
    amberCoins: 200,
    totalEarned: 200,
    totalSpent: 0
  };

  it('validates wager amount against minimum, maximum and current balance', () => {
    // Too low
    const low = validateWagerAmount(5, initialWallet);
    expect(low.valid).toBe(false);
    expect(low.reason).toContain('Aposta mínima');

    // Too high
    const high = validateWagerAmount(1000, initialWallet);
    expect(high.valid).toBe(false);
    expect(high.reason).toContain('Aposta máxima');

    // Insufficient funds
    const brokeWallet: WalletState = { amberCoins: 30, totalEarned: 30, totalSpent: 0 };
    const noMoney = validateWagerAmount(50, brokeWallet);
    expect(noMoney.valid).toBe(false);
    expect(noMoney.reason).toContain('Saldo insuficiente');

    // Valid
    const valid = validateWagerAmount(50, initialWallet);
    expect(valid.valid).toBe(true);
  });

  it('deducts wager safely before starting the match', () => {
    const deductRes = processWagerDeduction(initialWallet, 50);
    expect(deductRes.success).toBe(true);
    expect(deductRes.wallet.amberCoins).toBe(150);
    expect(deductRes.wallet.totalSpent).toBe(50);
  });

  it('settles victory by rewarding pot minus arena fee percentage', () => {
    // Deducted 50, now at 150
    const walletAfterDeduct: WalletState = { amberCoins: 150, totalEarned: 200, totalSpent: 50 };
    const settled = new Set<string>();

    const res = settleBattleOutcome(
      walletAfterDeduct,
      50,
      'victory',
      'battle-win-1',
      settled,
      DEFAULT_BATTLE_WAGER_CONFIG
    );

    expect(res.success).toBe(true);
    // 50 * 2 = 100 pot, 10% fee = 90 reward
    expect(res.rewardCoins).toBe(90);
    expect(res.wallet.amberCoins).toBe(240); // 150 + 90
    expect(res.netChange).toBe(40); // 90 - 50 net gain
    expect(res.message).toContain('Vitória esmagadora!');
  });

  it('refunds wager in case of draw or match cancellation', () => {
    const walletAfterDeduct: WalletState = { amberCoins: 150, totalEarned: 200, totalSpent: 50 };
    const settled = new Set<string>();

    const resDraw = settleBattleOutcome(
      walletAfterDeduct,
      50,
      'draw',
      'battle-draw-1',
      settled
    );
    expect(resDraw.success).toBe(true);
    expect(resDraw.refundCoins).toBe(50);
    expect(resDraw.wallet.amberCoins).toBe(200);

    const resCancel = settleBattleOutcome(
      walletAfterDeduct,
      50,
      'cancelled',
      'battle-cancel-1',
      settled
    );
    expect(resCancel.success).toBe(true);
    expect(resCancel.refundCoins).toBe(50);
    expect(resCancel.wallet.amberCoins).toBe(200);
  });

  it('deducts nothing further on defeat and keeps existing balance', () => {
    const walletAfterDeduct: WalletState = { amberCoins: 150, totalEarned: 200, totalSpent: 50 };
    const settled = new Set<string>();

    const resDefeat = settleBattleOutcome(
      walletAfterDeduct,
      50,
      'defeat',
      'battle-loss-1',
      settled
    );
    expect(resDefeat.success).toBe(true);
    expect(resDefeat.rewardCoins).toBe(0);
    expect(resDefeat.netChange).toBe(-50);
    expect(resDefeat.wallet.amberCoins).toBe(150);
  });

  it('prevents duplicate settlement for the same battle ID (idempotency)', () => {
    const wallet: WalletState = { amberCoins: 200, totalEarned: 200, totalSpent: 0 };
    const settled = new Set<string>(['already-settled-battle-id']);

    const res = settleBattleOutcome(
      wallet,
      50,
      'victory',
      'already-settled-battle-id',
      settled
    );
    expect(res.success).toBe(false);
    expect(res.message).toContain('já foi liquidada');
    expect(res.wallet.amberCoins).toBe(200);
  });
});
