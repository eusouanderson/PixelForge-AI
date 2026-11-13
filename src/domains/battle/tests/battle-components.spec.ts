import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { WalletState } from '@/domains/economy/types';
import type { CharacterSaveRecord } from '@/domains/persistence/types';
import type { NearbyDiagnosticLogEntry } from '@/domains/breeding/types';
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';
import type {
  BattleDiscoveredOpponent,
  BattleP2PMessage,
  BattleParticipant,
  BattleSimulationResult,
  BattleTransportPort
} from '../types';
import BattleArenaCanvas from '../presentation/BattleArenaCanvas.vue';
import BattleHistoryModal from '../presentation/BattleHistoryModal.vue';
import BattleArenaModal from '../presentation/BattleArenaModal.vue';

class MockBattleTransport implements BattleTransportPort {
  public localPeerId = 'peer-local-test';
  public playerName = 'Treinador Teste';
  public status = 'idle';
  public peers: BattleDiscoveredOpponent[] = [];
  public diagnosticLogs: NearbyDiagnosticLogEntry[] = [
    { timestampMs: 1000, level: 'info', message: 'Iniciando rádio P2P' },
    { timestampMs: 2000, level: 'warn', message: 'Aviso de sinal' },
    { timestampMs: 3000, level: 'error', message: 'Erro de conexão teste' }
  ];
  public connectedEndpointId: string | null = null;
  public sentMessages: BattleP2PMessage[] = [];

  public statusHandler: ((s: string) => void) | null = null;
  public peersHandler: ((p: readonly BattleDiscoveredOpponent[]) => void) | null = null;
  public logHandler: ((l: readonly NearbyDiagnosticLogEntry[]) => void) | null = null;
  public messageHandler: ((m: BattleP2PMessage) => void) | null = null;
  public errorHandler: ((e: Error) => void) | null = null;

  public async connect(_channelId: string): Promise<void> {
    this.status = 'discovering';
    this.statusHandler?.(this.status);
  }
  public disconnect(): void {
    this.status = 'idle';
    this.statusHandler?.(this.status);
  }
  public sendBattleMessage(msg: BattleP2PMessage): void {
    this.sentMessages.push(msg);
  }
  public onBattleMessage(handler: (msg: BattleP2PMessage) => void): () => void {
    this.messageHandler = handler;
    return () => {
      this.messageHandler = null;
    };
  }
  public onError(handler: (err: Error) => void): () => void {
    this.errorHandler = handler;
    return () => {
      this.errorHandler = null;
    };
  }
  public getConnectionStatus(): string {
    return this.status;
  }
  public getDiscoveredPeers(): readonly BattleDiscoveredOpponent[] {
    return this.peers;
  }
  public async connectToPeer(endpointId: string): Promise<void> {
    this.connectedEndpointId = endpointId;
  }
  public getDiagnosticLogs(): readonly NearbyDiagnosticLogEntry[] {
    return this.diagnosticLogs;
  }
  public onDiagnosticLog(handler: (logs: readonly NearbyDiagnosticLogEntry[]) => void): () => void {
    this.logHandler = handler;
    handler(this.diagnosticLogs);
    return () => {
      this.logHandler = null;
    };
  }
  public onStatusChange(handler: (status: string) => void): () => void {
    this.statusHandler = handler;
    handler(this.status);
    return () => {
      this.statusHandler = null;
    };
  }
  public onPeersChange(handler: (peers: readonly BattleDiscoveredOpponent[]) => void): () => void {
    this.peersHandler = handler;
    handler(this.peers);
    return () => {
      this.peersHandler = null;
    };
  }
  public getActiveEndpointId(): string | null {
    return this.connectedEndpointId;
  }
}

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

  it('handles full BattleArenaModal P2P connection bar, telemetry logs, opponent pairing, and error recovery', async () => {
    const saveRec = createMockSaveRecord();
    const wallet: WalletState = { amberCoins: 500, totalEarned: 500, totalSpent: 0 };
    const mockTransport = new MockBattleTransport();

    // Mock clipboard
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy
      },
      configurable: true,
      writable: true
    });

    const wrapper = mount(BattleArenaModal, {
      props: {
        activeCreature: saveRec,
        wallet,
        transportOverride: mockTransport,
        embedded: true
      }
    });

    // Verify initial connection bar status
    expect(wrapper.text()).toContain('Status:');
    expect(wrapper.text()).toContain('Aguardando busca');
    expect(wrapper.find('[data-testid="close-battle-modal-btn"]').exists()).toBe(false); // embedded mode hides close button

    // Toggle diagnostic logs
    const logsBtn = wrapper.find('[data-testid="battle-logs-toggle-btn"]');
    expect(logsBtn.text()).toContain('Logs (3)');
    await logsBtn.trigger('click');
    expect(wrapper.find('[data-testid="battle-diagnostic-logs"]').exists()).toBe(true);

    // Copy logs
    const copyBtn = wrapper.find('[data-testid="battle-copy-logs-btn"]');
    await copyBtn.trigger('click');
    expect(writeTextSpy).toHaveBeenCalled();
    expect(copyBtn.text()).toContain('✓ Copiado');

    // Simulate error state
    mockTransport.statusHandler?.('failed');
    await flushPromises();
    expect(wrapper.find('[data-testid="connection-error-banner"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Falha na conexão');
    const retryBtn = wrapper.find('[data-testid="start-battle-discovery-btn"]');
    expect(retryBtn.text()).toContain('Tentar Novamente');

    // Simulate various status transitions
    mockTransport.statusHandler?.('authenticating');
    await flushPromises();
    expect(wrapper.text()).toContain('Autenticando sessão segura...');

    mockTransport.statusHandler?.('connecting');
    await flushPromises();
    expect(wrapper.text()).toContain('Conectando ao dispositivo...');

    mockTransport.statusHandler?.('player_found');
    await flushPromises();
    expect(wrapper.text()).toContain('Desafiante encontrado!');

    mockTransport.statusHandler?.('discovering');
    await flushPromises();
    expect(wrapper.text()).toContain('Procurando desafiantes próximos (Nearby)...');
    expect(wrapper.find('[data-testid="start-battle-discovery-btn"]').text()).toContain('Buscando...');

    // Discover opponents
    mockTransport.peersHandler?.([
      {
        endpointId: 'ep-alpha',
        peerId: 'peer-alpha',
        playerName: 'Treinador Alfa',
        discoveredAtMs: Date.now()
      }
    ]);
    await flushPromises();

    expect(wrapper.text()).toContain('Treinador Alfa');
    expect(wrapper.text()).toContain('ID: ep-alpha');

    // Challenge discovered opponent
    const challengeBtn = wrapper.find('[data-testid="challenge-peer-peer-alpha"]');
    expect(challengeBtn.exists()).toBe(true);
    await challengeBtn.trigger('click');
    await flushPromises();

    expect(mockTransport.connectedEndpointId).toBe('ep-alpha');
    expect(wrapper.find('[data-testid="awaiting-confirmation-view"]').exists()).toBe(true);

    // Cancel battle from awaiting confirmation
    const cancelBtn = wrapper.find('[data-testid="awaiting-confirmation-view"] button');
    await cancelBtn.trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="awaiting-confirmation-view"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('handles incoming challenge invite, acceptance and rejection in BattleArenaModal', async () => {
    const saveRec = createMockSaveRecord();
    const wallet: WalletState = { amberCoins: 500, totalEarned: 500, totalSpent: 0 };
    const mockTransport = new MockBattleTransport();

    const wrapper = mount(BattleArenaModal, {
      props: {
        activeCreature: saveRec,
        wallet,
        transportOverride: mockTransport
      }
    });

    // Simulate incoming challenge message
    mockTransport.messageHandler?.({
      protocolVersion: '1.0.0',
      messageId: 'msg-challenge-1',
      type: 'BATTLE_INVITE',
      senderId: 'remote-challenger',
      sessionId: 's-1',
      sequence: 1,
      payload: {
        participant: createMockParticipant('remote-challenger', 'glacissauro'),
        wagerAmount: 50
      },
      timestampMs: Date.now()
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="incoming-invite-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Desafio Recebido!');
    expect(wrapper.text()).toContain('GLACISSAURO');

    // Reject invite
    await wrapper.find('[data-testid="reject-battle-invite-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="incoming-invite-card"]').exists()).toBe(false);

    // Send another invite and accept
    mockTransport.messageHandler?.({
      protocolVersion: '1.0.0',
      messageId: 'msg-challenge-2',
      type: 'BATTLE_INVITE',
      senderId: 'remote-challenger-2',
      sessionId: 's-2',
      sequence: 1,
      payload: {
        participant: createMockParticipant('remote-challenger-2', 'glacissauro'),
        wagerAmount: 50
      },
      timestampMs: Date.now()
    });
    await flushPromises();

    await wrapper.find('[data-testid="accept-battle-invite-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="incoming-invite-card"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('renders battle result view, claims reward, and handles theme variants in BattleArenaModal', async () => {
    const saveRec = createMockSaveRecord();
    const wallet: WalletState = { amberCoins: 200, totalEarned: 200, totalSpent: 0 };
    const mockTransport = new MockBattleTransport();

    // Test with explicit theme
    const customTheme = {
      primaryColor: '#ff0000',
      highlightColor: '#ff5555',
      accentGlow: 'none',
      badgeBackground: '#111',
      borderColor: '#222',
      borderSubtleColor: '#333',
      headerBackground: '#444',
      cardBackground: '#555',
      cardDarkBackground: '#666',
      containerBackground: '#777',
      elementBackground: '#888',
      rootBackground: '#000',
      ambientGradient: 'radial-gradient(#111, #000)'
    };

    const wrapper = mount(BattleArenaModal, {
      props: {
        activeCreature: saveRec,
        wallet,
        transportOverride: mockTransport,
        theme: customTheme
      }
    });

    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();

    // Test with unknown character ID fallback
    const brokenGenome = {
      ...saveRec.genetics,
      phenotype: {
        ...saveRec.genetics.phenotype,
        colors: { base: '', crest: '', belly: '', eye: '' }
      }
    };
    const brokenRec: CharacterSaveRecord = {
      ...saveRec,
      runtime: {
        ...saveRec.runtime,
        characterId: 'unknown-dino' as import('@/domains/characters/types').CharacterId
      },
      genetics: brokenGenome
    };

    const wrapperBroken = mount(BattleArenaModal, {
      props: {
        activeCreature: brokenRec,
        wallet,
        transportOverride: mockTransport
      }
    });
    expect(wrapperBroken.exists()).toBe(true);
    wrapperBroken.unmount();
  });
});
