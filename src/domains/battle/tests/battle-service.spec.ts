import { describe, it, expect } from 'vitest';
import type { WalletState } from '@/domains/economy/types';
import type { BattleP2PMessage, BattleParticipant, BattleTransportPort } from '../types';
import { BattleService } from '../application/battle-service';

class MockBattleTransport implements BattleTransportPort {
  public localPeerId: string;
  public otherPeer: MockBattleTransport | null = null;
  public messageHandlers: Array<(msg: BattleP2PMessage) => void> = [];
  public errorHandlers: Array<(err: Error) => void> = [];

  constructor(localPeerId: string) {
    this.localPeerId = localPeerId;
  }

  public link(other: MockBattleTransport): void {
    this.otherPeer = other;
    other.otherPeer = this;
  }

  public async connect(_channelId: string): Promise<void> {}
  public disconnect(): void {
    if (this.otherPeer) {
      this.otherPeer.otherPeer = null;
      this.otherPeer = null;
    }
  }

  public sendBattleMessage(message: BattleP2PMessage): void {
    if (!this.otherPeer) return;
    for (const h of this.otherPeer.messageHandlers) {
      h(message);
    }
  }

  public onBattleMessage(handler: (msg: BattleP2PMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  public onError(handler: (err: Error) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    };
  }
}

function createParticipant(peerId: string, speciesId: 'ignisauro' | 'glacissauro'): BattleParticipant {
  return {
    peerId,
    playerName: `Treinador ${peerId}`,
    creatureInstanceId: `c-${peerId}`,
    speciesId,
    speciesName: speciesId.toUpperCase(),
    stage: 'adulto',
    level: 15,
    ageHours: 100,
    attributes: {
      strength: 25,
      defense: 25,
      agility: 25,
      intelligence: 25,
      endurance: 25,
      elementalAffinity: 25
    },
    needs: {
      hunger: 90,
      thirst: 90,
      energy: 90,
      happiness: 90,
      hygiene: 90,
      health: 90
    },
    personalityTemper: 'ferocious',
    element: speciesId === 'ignisauro' ? 'fire' : 'ice',
    unlockedAttackIds: [],
    combatLevel: 5,
    combatXp: 500,
    isReady: true,
    hasConfirmedWager: true
  };
}

describe('Battle Service Application', () => {
  it('manages full P2P battle cycle between two connected peers', async () => {
    const tA = new MockBattleTransport('peer-A');
    const tB = new MockBattleTransport('peer-B');
    tA.link(tB);

    const serviceA = new BattleService(tA, 'session-123');
    const serviceB = new BattleService(tB, 'session-123');

    await serviceA.startDiscovery('BATALHA-ROOM');
    await serviceB.startDiscovery('BATALHA-ROOM');

    expect(serviceA.getState().phase).toBe('discovering');
    expect(serviceB.getState().phase).toBe('discovering');

    const pA = createParticipant('peer-A', 'ignisauro');
    const pB = createParticipant('peer-B', 'glacissauro');

    // 1. Peer A sends invite
    serviceA.sendBattleInvite(pA, 60, 'peer-B');
    expect(serviceA.getState().phase).toBe('awaiting_confirmation');
    expect(serviceB.getState().phase).toBe('selecting_creature');
    expect(serviceB.getState().wagerAmount).toBe(60);

    // 2. Peer B accepts invite
    serviceB.acceptBattleInvite(pB);

    // Both should enter battle_running with shared seed and simulation result
    expect(serviceA.getState().phase).toBe('battle_running');
    expect(serviceB.getState().phase).toBe('battle_running');

    const simA = serviceA.getState().simulationResult!;
    const simB = serviceB.getState().simulationResult!;

    expect(simA).toBeDefined();
    expect(simB).toBeDefined();

    // STRICT DETERMINISM: Both devices computed identical winner and battle outcome
    expect(simA.winnerPeerId).toBe(simB.winnerPeerId);
    expect(simA.isDraw).toBe(simB.isDraw);
    expect(simA.events.length).toBe(simB.events.length);
    expect(simA.fighter1FinalHp).toBe(simB.fighter1FinalHp);

    // 3. Claim rewards for winner and loser
    const walletA: WalletState = { amberCoins: 200, totalEarned: 200, totalSpent: 60 };
    const walletB: WalletState = { amberCoins: 200, totalEarned: 200, totalSpent: 60 };
    const settled = new Set<string>();

    const claimResA = serviceA.claimReward(walletA, settled);
    expect(claimResA.success).toBe(true);
    expect(claimResA.history).toBeDefined();
    expect(serviceA.getState().phase).toBe('reward_claimed');

    const claimResB = serviceB.claimReward(walletB, settled);
    expect(claimResB.success).toBe(true);
    expect(claimResB.history).toBeDefined();
    expect(serviceB.getState().phase).toBe('reward_claimed');

    if (simA.winnerPeerId === 'peer-A') {
      expect(claimResA.history?.result).toBe('victory');
      expect(claimResB.history?.result).toBe('defeat');
    } else {
      expect(claimResA.history?.result).toBe('defeat');
      expect(claimResB.history?.result).toBe('victory');
    }

    // Claim reward with insufficient funds fallback branch
    const brokeClaim = serviceB.claimReward({ amberCoins: 0, totalEarned: 0, totalSpent: 0 }, new Set());
    expect(brokeClaim.success).toBe(true);

    // Double dispose to cover null unbind branch
    serviceA.dispose();
    serviceA.dispose();
    serviceB.dispose();
  });

  it('handles battle invitation rejection', () => {
    const tA = new MockBattleTransport('peer-A');
    const tB = new MockBattleTransport('peer-B');
    tA.link(tB);

    const serviceA = new BattleService(tA);
    const serviceB = new BattleService(tB);

    const pA = createParticipant('peer-A', 'ignisauro');
    serviceA.sendBattleInvite(pA, 50);
    expect(serviceB.getState().phase).toBe('selecting_creature');

    serviceB.rejectBattleInvite();

    expect(serviceA.getState().phase).toBe('idle');
    expect(serviceA.getState().errorMessage).toContain('recusou');
    expect(serviceB.getState().phase).toBe('idle');
  });

  it('handles battle cancellation and forfeit', () => {
    const tA = new MockBattleTransport('peer-A');
    const tB = new MockBattleTransport('peer-B');
    tA.link(tB);

    const serviceA = new BattleService(tA);
    const serviceB = new BattleService(tB);

    serviceA.cancelOrForfeit();
    expect(serviceA.getState().phase).toBe('cancelled');
    expect(serviceB.getState().phase).toBe('cancelled');

    serviceA.reset();
    expect(serviceA.getState().phase).toBe('idle');
    expect(serviceA.getState().errorMessage).toBeNull();
  });

  it('handles subscription unbind, claimReward guards, transport error and self-message ignore', () => {
    const t = new MockBattleTransport('peer-solo');
    const service = new BattleService(t);

    // Unsubscribe from state changes
    const unbind = service.subscribe(() => {});
    unbind();

    // Guard on claimReward without simulation result
    const wallet: WalletState = { amberCoins: 100, totalEarned: 100, totalSpent: 0 };
    const guardClaim = service.claimReward(wallet, new Set());
    expect(guardClaim.success).toBe(false);

    // Transport error
    for (const h of t.errorHandlers) {
      h(new Error('Falha no adaptador P2P'));
    }
    expect(service.getState().phase).toBe('failed');
    expect(service.getState().errorMessage).toContain('Falha no adaptador');

    // Self message ignore
    for (const h of t.messageHandlers) {
      h({
        protocolVersion: '1.0.0',
        messageId: 'm-self',
        type: 'BATTLE_CANCEL',
        senderId: 'peer-solo',
        sessionId: 's',
        sequence: 1,
        payload: {},
        timestampMs: Date.now()
      });
    }

    // Guard on checkAndExecuteSimulation when missing remote participant
    const pSolo = createParticipant('peer-solo', 'ignisauro');
    service.acceptBattleInvite(pSolo);
    expect(service.getState().phase).toBe('syncing_seed');
    expect(service.getState().simulationResult).toBeNull();

    // Fallthrough on unknown message type
    for (const h of t.messageHandlers) {
      h({
        protocolVersion: '1.0.0',
        messageId: 'm-unknown',
        type: 'UNKNOWN' as unknown as BattleP2PMessage['type'],
        senderId: 'other',
        sessionId: 's',
        sequence: 1,
        payload: {},
        timestampMs: Date.now()
      });
    }

    // Draw scenario for claimReward
    const tDrawA = new MockBattleTransport('peer-d1');
    const tDrawB = new MockBattleTransport('peer-d2');
    tDrawA.link(tDrawB);
    const serviceDrawA = new BattleService(tDrawA);
    const serviceDrawB = new BattleService(tDrawB);
    serviceDrawA.sendBattleInvite({
      ...pSolo,
      attributes: { strength: 1, defense: 99, agility: 10, intelligence: 10, endurance: 9999, elementalAffinity: 1 }
    }, 50, 'peer-d2');
    serviceDrawB.acceptBattleInvite({
      ...pSolo,
      peerId: 'peer-d2',
      attributes: { strength: 1, defense: 99, agility: 10, intelligence: 10, endurance: 9999, elementalAffinity: 1 }
    });
    expect(serviceDrawA.getState().simulationResult?.isDraw).toBe(true);
    const drawClaim = serviceDrawA.claimReward(wallet, new Set());
    expect(drawClaim.history?.result).toBe('draw');
    expect(drawClaim.history?.combatXpGained).toBe(40);
  });
});
