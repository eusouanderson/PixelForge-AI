import { describe, it, expect } from 'vitest';
import { BreedingService } from '../application/breeding-service';
import { DirectLinkedMockP2PAdapter } from '../infrastructure/p2p-channel-adapter';
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';

describe('Breeding: Application Service & Protocol', () => {
  const maleIgnis = createGenesisGenome('ignisauro', 'male', 1000, 'male-ignis-genome');
  const femaleTerras = createGenesisGenome('terrassauro', 'female', 1000, 'female-terras-genome');

  it('runs complete breeding workflow between two devices', async () => {
    const transportA = new DirectLinkedMockP2PAdapter('peer-alpha');
    const transportB = new DirectLinkedMockP2PAdapter('peer-beta');
    transportA.link(transportB);

    const serviceA = new BreedingService(transportA, 'shared-breeding-session');
    const serviceB = new BreedingService(transportB, 'shared-breeding-session');

    // Subscriptions
    let stateA = serviceA.getState();
    let stateB = serviceB.getState();
    const unsubA = serviceA.subscribe((s) => {
      stateA = s;
    });
    const unsubB = serviceB.subscribe((s) => {
      stateB = s;
    });

    // 1. Discovery
    await serviceB.openDiscovery('breeding-room-1');
    await serviceA.openDiscovery('breeding-room-1');
    expect(stateA.phase).toBe('discovering');

    // 2. Select Creatures
    serviceA.selectLocalCreature('ignisauro', maleIgnis, 'Jogador A');
    serviceB.selectLocalCreature('terrassauro', femaleTerras, 'Jogador B');

    expect(stateA.remoteParticipant?.characterId).toBe('terrassauro');
    expect(stateB.remoteParticipant?.characterId).toBe('ignisauro');
    expect(stateA.compatibility?.compatible).toBe(true);
    expect(stateB.compatibility?.compatible).toBe(true);

    // 3. Confirm Ready
    serviceA.setLocalReady(true);
    expect(stateA.phase).toBe('awaiting_confirmation');

    serviceB.setLocalReady(true);

    // Animation stepping
    serviceA.setAnimationScene(1);
    expect(stateA.animationSceneIndex).toBe(1);
    expect(stateB.animationSceneIndex).toBe(1);

    // Let async commitments and revelations complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stateA.phase).toBe('completed');
    expect(stateB.phase).toBe('completed');

    // Consensus validation
    expect(stateA.ownership).not.toBeNull();
    expect(stateB.ownership).not.toBeNull();
    expect(stateA.ownership?.winningPeerId).toBe(stateB.ownership?.winningPeerId);

    // Ownership fairness and no-duplication guarantee:
    // Exactly one device produces the egg!
    if (stateA.ownership?.isLocalWinner) {
      expect(stateA.producedEgg).not.toBeNull();
      expect(stateB.producedEgg).toBeNull();
    } else {
      expect(stateA.producedEgg).toBeNull();
      expect(stateB.producedEgg).not.toBeNull();
    }

    // Both hold the complete genealogical record
    expect(stateA.historyRecord).not.toBeNull();
    expect(stateB.historyRecord).not.toBeNull();
    expect(stateA.historyRecord?.offspringGenomeId).toBe(stateB.historyRecord?.offspringGenomeId);
    expect(stateA.historyRecord?.sireGenomeId).toBe(maleIgnis.genomeId);
    expect(stateA.historyRecord?.damGenomeId).toBe(femaleTerras.genomeId);

    unsubA();
    unsubB();
    serviceA.dispose();
    serviceB.dispose();
  });

  it('handles cancellation and propagates reason', () => {
    const transportA = new DirectLinkedMockP2PAdapter('peer-alpha');
    const transportB = new DirectLinkedMockP2PAdapter('peer-beta');
    transportA.link(transportB);

    const serviceA = new BreedingService(transportA, 'cancel-session');
    const serviceB = new BreedingService(transportB, 'cancel-session');

    serviceA.cancel('Jogador A desistiu');

    expect(serviceA.getState().phase).toBe('cancelled');
    expect(serviceB.getState().phase).toBe('cancelled');
    expect(serviceB.getState().errorMessage).toBe('Jogador A desistiu');

    serviceA.dispose();
    serviceB.dispose();
  });

  it('fails session upon cryptographic tampering in reveal step', async () => {
    const transportA = new DirectLinkedMockP2PAdapter('peer-alpha');
    const transportB = new DirectLinkedMockP2PAdapter('peer-beta');
    transportA.link(transportB);

    const serviceA = new BreedingService(transportA, 'tamper-session');

    // Manually inject a commitment to serviceA
    transportB.send({
      type: 'COMMITMENT',
      senderId: 'peer-beta',
      sessionId: 'tamper-session',
      payload: {
        peerId: 'peer-beta',
        commitHash: 'expected-hash-abc'
      },
      timestampMs: 1000
    });

    // Now send reveal with forged seed that does not hash to 'expected-hash-abc'
    transportB.send({
      type: 'REVEAL',
      senderId: 'peer-beta',
      sessionId: 'tamper-session',
      payload: {
        peerId: 'peer-beta',
        secretSeed: 'forged-seed',
        salt: 'forged-salt'
      },
      timestampMs: 1001
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(serviceA.getState().phase).toBe('failed');
    expect(serviceA.getState().errorMessage).toContain('compromisso adulterado');

    serviceA.dispose();
  });

  it('fails session if remote peer reveals before sending commitment', async () => {
    const transportA = new DirectLinkedMockP2PAdapter('peer-alpha');
    const transportB = new DirectLinkedMockP2PAdapter('peer-beta');
    transportA.link(transportB);

    const serviceA = new BreedingService(transportA, 'no-commit-session');

    // Send REVEAL without any prior COMMITMENT
    transportB.send({
      type: 'REVEAL',
      senderId: 'peer-beta',
      sessionId: 'no-commit-session',
      payload: {
        peerId: 'peer-beta',
        secretSeed: 'early-seed',
        salt: 'early-salt'
      },
      timestampMs: 1000
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(serviceA.getState().phase).toBe('failed');
    expect(serviceA.getState().errorMessage).toContain('Compromisso remoto não encontrado antes da revelação');

    serviceA.dispose();
  });

  it('handles transport errors, early ready calls, and cancel without reason', () => {
    let errHandler: ((err: Error) => void) | undefined;
    let msgHandler: ((msg: import('../types').P2PMessage) => void) | undefined;

    const mockPort: import('../types').P2PTransportPort = {
      localPeerId: 'port-peer',
      connect: async () => {},
      disconnect: () => {},
      send: () => {},
      onMessage: (h) => {
        msgHandler = h;
        return () => {};
      },
      onError: (h) => {
        errHandler = h;
        return () => {};
      }
    };

    const service = new BreedingService(mockPort, 'edge-case-session');

    // Calling setLocalReady before creature is selected does nothing
    service.setLocalReady(true);
    expect(service.getState().localParticipant).toBeNull();

    // Trigger transport error
    const callErr = errHandler as ((err: Error) => void) | undefined;
    if (callErr) {
      callErr(new Error('Falha de rede transport'));
      expect(service.getState().phase).toBe('failed');
      expect(service.getState().errorMessage).toBe('Falha de rede transport');
    }

    // Trigger cancel without reason
    const callMsg = msgHandler as ((msg: import('../types').P2PMessage) => void) | undefined;
    if (callMsg) {
      // First handshake sets remotePeerId
      callMsg({
        type: 'HANDSHAKE',
        senderId: 'remote-1',
        sessionId: 'edge-case-session',
        payload: {},
        timestampMs: 1100
      });
      // Second handshake ignored when remotePeerId already set
      callMsg({
        type: 'HANDSHAKE',
        senderId: 'remote-2',
        sessionId: 'edge-case-session',
        payload: {},
        timestampMs: 1101
      });

      callMsg({
        type: 'CONFIRM_BREEDING',
        senderId: 'remote-1',
        sessionId: 'edge-case-session',
        payload: { isReady: true },
        timestampMs: 1200
      });

      callMsg({
        type: 'CANCEL',
        senderId: 'remote-1',
        sessionId: 'edge-case-session',
        payload: {},
        timestampMs: 1200
      });
      expect(service.getState().phase).toBe('cancelled');
      expect(service.getState().errorMessage).toContain('A outra ponta cancelou a reprodução.');
    }

    service.dispose();
    // Dispose a second time
    service.dispose();
  });

  it('evaluates incompatible character selection and prevents advancing to awaiting_confirmation', () => {
    const transportA = new DirectLinkedMockP2PAdapter('peer-alpha');
    const transportB = new DirectLinkedMockP2PAdapter('peer-beta');
    transportA.link(transportB);

    const serviceA = new BreedingService(transportA, 'incompatible-session');
    const serviceB = new BreedingService(transportB, 'incompatible-session');

    const maleTerras = createGenesisGenome('terrassauro', 'male', 1000, 'male-terras-genome');

    // Both select males (incompatible)
    serviceA.selectLocalCreature('ignisauro', maleIgnis);
    serviceB.selectLocalCreature('terrassauro', maleTerras);

    expect(serviceA.getState().compatibility?.compatible).toBe(false);
    expect(serviceA.getState().phase).toBe('compatibility_check');

    // Change selection while already in compatibility_check
    serviceA.selectLocalCreature('terrassauro', maleTerras);
    expect(serviceA.getState().phase).toBe('compatibility_check');

    // Attempting to set ready when incompatible does not start breeding
    serviceA.setLocalReady(true);
    serviceB.setLocalReady(true);
    expect(serviceA.getState().phase).toBe('compatibility_check');

    serviceA.dispose();
    serviceB.dispose();
  });

  it('selects local creature directly from idle and allows re-selection', () => {
    const transportA = new DirectLinkedMockP2PAdapter('peer-idle');
    const transportB = new DirectLinkedMockP2PAdapter('peer-dummy');
    transportA.link(transportB);
    const service = new BreedingService(transportA);
    expect(service.getState().phase).toBe('idle');

    // Select from idle (transitions idle -> pairing -> character_selection)
    service.selectLocalCreature('ignisauro', maleIgnis);
    expect(service.getState().phase).toBe('character_selection');

    // Re-select while already in character_selection
    service.selectLocalCreature('ignisauro', maleIgnis);
    expect(service.getState().phase).toBe('character_selection');

    service.dispose();
  });
});
