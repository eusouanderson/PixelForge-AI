import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { WalletState } from '@/domains/economy/types';
import type { CharacterSaveRecord } from '@/domains/persistence/types';
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';
import type { BattleParticipant, BattleSimulationResult } from '../types';
import BattleArenaCanvas from '../presentation/BattleArenaCanvas.vue';
import BattleHistoryModal from '../presentation/BattleHistoryModal.vue';
import BattleArenaModal from '../presentation/BattleArenaModal.vue';

function createMockParticipant(peerId: string, speciesId: 'ignisauro' | 'glacissauro'): BattleParticipant {
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
      strength: 30,
      defense: 25,
      agility: 25,
      intelligence: 25,
      endurance: 30,
      elementalAffinity: 30
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

function createMockSimulationResult(): BattleSimulationResult {
  return {
    battleId: 'b-mock-123',
    seed: 'seed-xyz',
    winnerPeerId: 'p1',
    loserPeerId: 'p2',
    isDraw: false,
    durationTicks: 4,
    events: [
      {
        sequence: 0,
        tick: 0,
        type: 'match_start',
        actorId: 'p1',
        targetId: 'p2',
        actorHp: 200,
        targetHp: 200,
        actorStamina: 100,
        description: 'Batalha iniciada!'
      },
      {
        sequence: 1,
        tick: 1,
        type: 'damage_inflicted',
        actorId: 'p1',
        targetId: 'p2',
        damage: 35,
        actorHp: 200,
        targetHp: 165,
        actorStamina: 80,
        description: 'Golpe certeiro infligiu 35 de dano!'
      },
      {
        sequence: 2,
        tick: 2,
        type: 'critical_hit',
        actorId: 'p1',
        actorHp: 200,
        actorStamina: 70,
        description: 'Crítico fulminante!'
      },
      {
        sequence: 3,
        tick: 3,
        type: 'fighter_fainted',
        actorId: 'p2',
        actorHp: 0,
        actorStamina: 50,
        description: 'Lutador desmaiou!'
      },
      {
        sequence: 4,
        tick: 4,
        type: 'match_end',
        actorId: 'p1',
        actorHp: 200,
        targetHp: 0,
        actorStamina: 70,
        description: 'Vitória de p1!'
      }
    ],
    fighter1FinalHp: 200,
    fighter2FinalHp: 0,
    totalDamageFighter1: 35,
    totalDamageFighter2: 0
  };
}

function createMockSaveRecord(): CharacterSaveRecord {
  return {
    id: 'char-1',
    runtime: {
      characterId: 'ignisauro',
      customNickname: 'Foguinho',
      currentStage: 'adulto',
      currentAnimation: 'idle',
      ageHours: 120,
      emotionalState: 'happy',
      healthCondition: 'healthy',
      activeDiseases: [],
      careHistory: [],
      createdAtMs: 1000,
      lastUpdatedAtMs: 2000
    },
    needs: {
      hunger: 90,
      thirst: 90,
      energy: 90,
      happiness: 90,
      hygiene: 90,
      health: 90
    },
    attributes: {
      strength: 30,
      defense: 25,
      agility: 25,
      intelligence: 25,
      endurance: 30,
      elementalAffinity: 30
    },
    progression: {
      level: 15,
      currentXp: 100,
      nextLevelXp: 500,
      totalXpEarned: 2000,
      currentStage: 'adulto'
    },
    genetics: createGenesisGenome('ignisauro', 'female', 1000),
    battleRecord: {
      totalBattles: 10,
      wins: 7,
      losses: 2,
      draws: 1,
      currentStreak: 3,
      bestStreak: 4,
      combatXp: 850,
      combatLevel: 5,
      unlockedAttacks: ['mordida-ignea', 'sopro-magmatico'],
      recentOpponents: []
    }
  };
}

describe('Battle Presentation Components', () => {
  it('renders BattleArenaCanvas and supports play/pause and skipToEnd', async () => {
    const f1 = createMockParticipant('p1', 'ignisauro');
    const f2 = createMockParticipant('p2', 'glacissauro');
    const sim = createMockSimulationResult();

    const wrapper = mount(BattleArenaCanvas, {
      props: {
        fighter1: f1,
        fighter2: f2,
        simulationResult: sim
      }
    });

    expect(wrapper.find('[data-testid="battle-arena-canvas-container"]').exists()).toBe(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="fighter1-hp"]').text()).toContain('200');

    // Controls
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(3);

    // Toggle play/pause
    await buttons[0].trigger('click');
    await buttons[0].trigger('click');

    // Toggle speed
    await buttons[1].trigger('click');

    // Skip to end
    await buttons[2].trigger('click');
    expect(wrapper.emitted('completed')).toBeTruthy();
  });

  it('renders BattleHistoryModal with career stats and emits close', async () => {
    const rec = createMockSaveRecord().battleRecord!;

    const wrapper = mount(BattleHistoryModal, {
      props: {
        battleRecord: rec,
        availableAttacks: [
          {
            id: 'atk-1',
            name: 'Mordida Ígnea',
            description: 'Mordida em chamas',
            element: 'fire',
            category: 'physical',
            compatibleSpecies: ['ignisauro'],
            minStage: 'crianca',
            minLevel: 4,
            baseDamage: 26,
            staminaCost: 18,
            accuracyPercent: 90,
            criticalChancePercent: 10,
            speedTicks: 3,
            recoveryTicks: 3,
            attributeScaling: {},
            animationName: 'comendo'
          }
        ],
        recentBattles: [
          {
            id: 'hist-1',
            timestampMs: 1000,
            battleId: 'b-1',
            localPlayerId: 'p1',
            opponentPlayerId: 'p2',
            opponentName: 'Adversário',
            localCreatureSpecies: 'ignisauro',
            opponentCreatureSpecies: 'glacissauro',
            result: 'victory',
            wagerAmount: 50,
            rewardCoins: 90,
            combatXpGained: 120,
            roundsCount: 4
          }
        ]
      }
    });

    expect(wrapper.find('[data-testid="stat-total-battles"]').text()).toBe('10');
    expect(wrapper.find('[data-testid="stat-wins"]').text()).toBe('7');
    expect(wrapper.find('[data-testid="stat-win-rate"]').text()).toBe('70%');

    await wrapper.find('[data-testid="close-battle-history-btn"]').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('renders BattleArenaModal, selects wager and starts discovery', async () => {
    const saveRec = createMockSaveRecord();
    const wallet: WalletState = {
      amberCoins: 300,
      totalEarned: 300,
      totalSpent: 0
    };

    const wrapper = mount(BattleArenaModal, {
      props: {
        activeCreature: saveRec,
        wallet
      }
    });

    expect(wrapper.find('[data-testid="battle-arena-modal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="current-wallet-display"]').text()).toContain('300 Âmbar');

    // Change wager to 100
    const wager100Btn = wrapper.find('[data-testid="wager-btn-100"]');
    await wager100Btn.trigger('click');

    // Click start discovery
    const searchBtn = wrapper.find('[data-testid="start-battle-discovery-btn"]');
    await searchBtn.trigger('click');

    // Open history submodal
    const openHistoryBtn = wrapper.find('[data-testid="open-history-btn"]');
    await openHistoryBtn.trigger('click');
    expect(wrapper.find('[data-testid="battle-history-modal"]').exists()).toBe(true);

    // Close main modal
    const closeBtn = wrapper.find('[data-testid="close-battle-modal-btn"]');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
