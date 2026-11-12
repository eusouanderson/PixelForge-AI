import type { WalletState } from '@/domains/economy/types';
import { earnCoins, spendCoins } from '@/domains/economy/domain/economy-engine';
import type { BattleWagerConfig } from '../types';

export const DEFAULT_BATTLE_WAGER_CONFIG: BattleWagerConfig = {
  defaultWager: 50,
  minWager: 10,
  maxWager: 500,
  winnerMultiplier: 1.8,
  arenaFeePercentage: 0.1
};

export interface WagerValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

export function validateWagerAmount(
  amount: number,
  wallet: WalletState,
  config: BattleWagerConfig = DEFAULT_BATTLE_WAGER_CONFIG
): WagerValidationResult {
  const safe = Math.floor(amount);
  if (safe < config.minWager) {
    return {
      valid: false,
      reason: `Aposta mínima na arena é de ${config.minWager} moedas Âmbar.`
    };
  }

  if (safe > config.maxWager) {
    return {
      valid: false,
      reason: `Aposta máxima na arena é de ${config.maxWager} moedas Âmbar.`
    };
  }

  if (wallet.amberCoins < safe) {
    return {
      valid: false,
      reason: `Saldo insuficiente (${wallet.amberCoins} Âmbar disponíveis, necessário ${safe}).`
    };
  }

  return { valid: true };
}

export interface SettlementResult {
  readonly success: boolean;
  readonly wallet: WalletState;
  readonly rewardCoins: number;
  readonly refundCoins: number;
  readonly netChange: number;
  readonly message: string;
}

export function processWagerDeduction(
  wallet: WalletState,
  wager: number
): { readonly success: boolean; readonly wallet: WalletState; readonly reason?: string } {
  const res = spendCoins(wallet, wager);
  return {
    success: res.success,
    wallet: res.wallet,
    reason: res.reason
  };
}

export function settleBattleOutcome(
  wallet: WalletState,
  wager: number,
  outcome: 'victory' | 'defeat' | 'draw' | 'cancelled',
  battleId: string,
  settledBattleIds: ReadonlySet<string>,
  config: BattleWagerConfig = DEFAULT_BATTLE_WAGER_CONFIG
): SettlementResult {
  if (settledBattleIds.has(battleId)) {
    return {
      success: false,
      wallet,
      rewardCoins: 0,
      refundCoins: 0,
      netChange: 0,
      message: 'Esta batalha já foi liquidada financeiramente.'
    };
  }

  const safeWager = Math.floor(wager);

  if (outcome === 'cancelled') {
    // Reembolso total do valor de entrada apostado
    const refundRes = earnCoins(wallet, safeWager);
    return {
      success: true,
      wallet: refundRes.wallet,
      rewardCoins: 0,
      refundCoins: safeWager,
      netChange: 0,
      message: `Batalha cancelada. Reembolso integral de ${safeWager} Âmbar efetuado.`
    };
  }

  if (outcome === 'draw') {
    // Empate: ambos recuperam suas apostas
    const refundRes = earnCoins(wallet, safeWager);
    return {
      success: true,
      wallet: refundRes.wallet,
      rewardCoins: 0,
      refundCoins: safeWager,
      netChange: 0,
      message: `Empate honroso! Aposta de ${safeWager} Âmbar devolvida.`
    };
  }

  if (outcome === 'defeat') {
    return {
      success: true,
      wallet,
      rewardCoins: 0,
      refundCoins: 0,
      netChange: -safeWager,
      message: `Derrota na arena. Aposta de ${safeWager} Âmbar perdida.`
    };
  }

  // Vitória: prêmio do pote (2 * aposta menos a taxa da arena)
  const totalPot = safeWager * 2;
  const prize = Math.round(totalPot * (1 - config.arenaFeePercentage));
  const prizeRes = earnCoins(wallet, prize);

  return {
    success: true,
    wallet: prizeRes.wallet,
    rewardCoins: prize,
    refundCoins: 0,
    netChange: prize - safeWager,
    message: `Vitória esmagadora! Prêmio de ${prize} Âmbar creditado na carteira.`
  };
}
