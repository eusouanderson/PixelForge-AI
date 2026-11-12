import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { BreedingService } from '../application/breeding-service';
import {
  NearbyConnectionsP2PAdapter,
  type NearbyConnectionsPluginInterface
} from '../infrastructure/nearby-connections-adapter';
import BreedingModal from '../presentation/BreedingModal.vue';
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';
import { crossGenomes } from '@/domains/genetics/domain/inheritance-engine';
import { createNewGameSaveSnapshot, resolveEggStatus } from '@/domains/persistence/domain/persistence-engine';
import type { GameSaveSnapshot } from '@/domains/persistence/types';

interface RadioNode {
  id: string;
  endpointName: string | null;
  advertising: boolean;
  discovering: boolean;
  connectedTo: Set<string>;
  initiatedWith: Set<string>;
  listeners: Record<string, Array<(data: unknown) => void>>;
}

/**
 * Simulates Google Play Services Nearby Connections P2P_POINT_TO_POINT asynchronously
 * between two Android devices (Phone A and Phone B), including realistic async ticks,
 * repeated onEndpointFound broadcasts, out-of-order callbacks, and 8001/8002/8003 guards.
 */
function createNearbyRadioSimulator(): {
  createPluginForDevice: (deviceId: string) => NearbyConnectionsPluginInterface;
  emitDuplicateDiscovery: (fromDeviceId: string, toDeviceId: string) => void;
} {
  const nodes = new Map<string, RadioNode>();

  const emit = (node: RadioNode, event: string, data: unknown): void => {
    const handlers = node.listeners[event] ?? [];
    for (const h of handlers) {
      h(data);
    }
  };

  const tryDiscoverPairs = (): void => {
    const all = Array.from(nodes.values());
    for (const discoverer of all) {
      if (!discoverer.discovering) continue;
      for (const advertiser of all) {
        if (discoverer.id === advertiser.id) continue;
        if (!advertiser.advertising || !advertiser.endpointName) continue;
        const epId = `ep-for-${advertiser.id}`;
        const info = advertiser.endpointName;
        queueMicrotask(() => {
          if (discoverer.discovering && advertiser.advertising) {
            emit(discoverer, 'onEndpointFound', {
              endpointId: epId,
              endpointName: info,
              serviceId: 'ai.pixelforge.virtualcreatures.breeding'
            });
          }
        });
      }
    }
  };

  const acceptedPairs = new Set<string>();

  const pairKey = (a: string, b: string) => [a, b].sort().join('::');

  const createPluginForDevice = (deviceId: string): NearbyConnectionsPluginInterface => {
    const node: RadioNode = {
      id: deviceId,
      endpointName: null,
      advertising: false,
      discovering: false,
      connectedTo: new Set(),
      initiatedWith: new Set(),
      listeners: {}
    };
    nodes.set(deviceId, node);

    return {
      async isAvailable() {
        return { available: true, statusCode: 0 };
      },
      async checkPermissions() {
        return { granted: true, missingCount: 0 };
      },
      async requestPermissions() {
        return { granted: true, missingCount: 0 };
      },
      async startAdvertising({ endpointName }) {
        node.advertising = true;
        node.endpointName = endpointName;
        tryDiscoverPairs();
        return { success: true };
      },
      async stopAdvertising() {
        node.advertising = false;
        return { success: true };
      },
      async startDiscovery() {
        node.discovering = true;
        tryDiscoverPairs();
        return { success: true };
      },
      async stopDiscovery() {
        node.discovering = false;
        return { success: true };
      },
      async requestConnection({ endpointId, endpointName }) {
        const targetId = endpointId.replace(/^ep-for-/, '');
        const target = nodes.get(targetId);
        if (!target) {
          throw new Error('8005: STATUS_ENDPOINT_UNKNOWN');
        }
        if (node.connectedTo.has(targetId) || node.initiatedWith.has(targetId)) {
          return { success: true };
        }
        node.initiatedWith.add(targetId);
        target.initiatedWith.add(node.id);

        const epOnTarget = `ep-for-${node.id}`;
        setTimeout(() => {
          emit(node, 'onConnectionInitiated', {
            endpointId,
            endpointName: target.endpointName ?? 'Peer',
            isIncoming: false
          });
          emit(target, 'onConnectionInitiated', {
            endpointId: epOnTarget,
            endpointName,
            isIncoming: true
          });
        }, 5);

        return { success: true };
      },
      async acceptConnection({ endpointId }) {
        const targetId = endpointId.replace(/^ep-for-/, '');
        const target = nodes.get(targetId);
        if (!target) {
          throw new Error('8005: STATUS_ENDPOINT_UNKNOWN');
        }
        acceptedPairs.add(`${node.id}->${targetId}`);
        if (acceptedPairs.has(`${targetId}->${node.id}`)) {
          // Simulate slightly staggered onConnectionResult arrival between two phones!
          setTimeout(() => {
            node.connectedTo.add(targetId);
            emit(node, 'onConnectionResult', {
              endpointId,
              statusCode: 0,
              success: true,
              statusMessage: 'STATUS_OK'
            });
          }, 2);
          setTimeout(() => {
            target.connectedTo.add(node.id);
            emit(target, 'onConnectionResult', {
              endpointId: `ep-for-${node.id}`,
              statusCode: 0,
              success: true,
              statusMessage: 'STATUS_OK'
            });
          }, 12);
        }
        return { success: true };
      },
      async rejectConnection() {
        return { success: true };
      },
      async sendPayload({ endpointId, payload }) {
        const targetId = endpointId.replace(/^ep-for-/, '');
        const target = nodes.get(targetId);
        if (!target || !node.connectedTo.has(targetId)) {
          throw new Error(`8012: STATUS_NOT_CONNECTED_TO_ENDPOINT (${endpointId})`);
        }
        const fromEp = `ep-for-${node.id}`;
        setTimeout(() => {
          emit(target, 'onPayloadReceived', {
            endpointId: fromEp,
            payload
          });
        }, 3);
        return { success: true };
      },
      async disconnect({ endpointId } = {}) {
        if (endpointId) {
          const targetId = endpointId.replace(/^ep-for-/, '');
          node.connectedTo.delete(targetId);
        }
        return { success: true };
      },
      async stopAllEndpoints() {
        node.advertising = false;
        node.discovering = false;
        node.connectedTo.clear();
        node.initiatedWith.clear();
        acceptedPairs.delete(`${pairKey(node.id, '')}`);
        return { success: true };
      },
      async addListener(eventName, listenerFunc) {
        if (!node.listeners[eventName]) node.listeners[eventName] = [];
        node.listeners[eventName].push(listenerFunc);
        return {
          remove: async () => {
            node.listeners[eventName] = node.listeners[eventName].filter((fn) => fn !== listenerFunc);
          }
        };
      },
      async removeAllListeners() {
        node.listeners = {};
      }
    };
  };

  const emitDuplicateDiscovery = (fromDeviceId: string, toDeviceId: string): void => {
    const discoverer = nodes.get(fromDeviceId);
    const advertiser = nodes.get(toDeviceId);
    if (!discoverer || !advertiser || !advertiser.endpointName) return;
    emit(discoverer, 'onEndpointFound', {
      endpointId: `ep-for-${advertiser.id}`,
      endpointName: advertiser.endpointName,
      serviceId: 'ai.pixelforge.virtualcreatures.breeding'
    });
  };

  return { createPluginForDevice, emitDuplicateDiscovery };
}

describe('Two-Device Nearby P2P Breeding Integration Simulation', () => {
  const maleSol = createGenesisGenome('solassauro', 'male', 1000, 'male-sol-genome');
  const femaleAqua = createGenesisGenome('terrassauro', 'female', 1000, 'female-terras-genome');

  it('reproduces real APK flow: pre-selected dinosaurs + clicking Connect + Nearby discovery + auto data exchange + breeding completion', async () => {
    const sim = createNearbyRadioSimulator();

    const transportA = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-z-phone-a',
      playerName: 'Treinador A',
      isNativeOverride: true,
      pluginOverride: sim.createPluginForDevice('phoneA')
    });
    const transportB = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-a-phone-b',
      playerName: 'Treinador B',
      isNativeOverride: true,
      pluginOverride: sim.createPluginForDevice('phoneB')
    });

    const serviceA = new BreedingService(transportA);
    const serviceB = new BreedingService(transportB);

    // 1. Just like BreedingModal.vue onMounted: both phones auto-select local dino BEFORE connecting!
    serviceA.selectLocalCreature('solassauro', maleSol, 'Treinador A');
    serviceB.selectLocalCreature('terrassauro', femaleAqua, 'Treinador B');

    // 2. Both users tap "Conectar" with matching room code SALA-777
    await serviceA.openDiscovery('SALA-777');
    await serviceB.openDiscovery('SALA-777');

    // Wait for async Nearby discovery, connection initiation, accept, staggered onConnectionResult, auth, and handshake
    await vi.waitFor(() => {
      expect(transportA.getConnectionStatus()).toBe('connected');
      expect(transportB.getConnectionStatus()).toBe('connected');
    }, { timeout: 3000 });

    // Simulate a late/duplicate Nearby onEndpointFound after connection (very common in Android BLE/Wi-Fi)
    sim.emitDuplicateDiscovery('phoneA', 'phoneB');
    sim.emitDuplicateDiscovery('phoneB', 'phoneA');

    await vi.waitFor(() => {
      expect(serviceA.getState().remoteParticipant?.characterId).toBe('terrassauro');
      expect(serviceB.getState().remoteParticipant?.characterId).toBe('solassauro');
      expect(serviceA.getState().phase).toBe('awaiting_confirmation');
      expect(serviceB.getState().phase).toBe('awaiting_confirmation');
    }, { timeout: 3000 });

    expect(serviceA.getState().errorMessage).toBeNull();
    expect(serviceB.getState().errorMessage).toBeNull();
    expect(serviceA.getState().compatibility?.compatible).toBe(true);
    expect(serviceB.getState().compatibility?.compatible).toBe(true);

    // 3. Both confirm breeding
    serviceA.setLocalReady(true);
    serviceB.setLocalReady(true);

    await vi.waitFor(() => {
      expect(serviceA.getState().phase).toBe('completed');
      expect(serviceB.getState().phase).toBe('completed');
    }, { timeout: 3000 });
    expect(serviceA.getState().historyRecord?.offspringGenomeId).toBe(
      serviceB.getState().historyRecord?.offspringGenomeId
    );
    const totalEggsProduced = (serviceA.getState().producedEgg ? 1 : 0) + (serviceB.getState().producedEgg ? 1 : 0);
    expect(totalEggsProduced).toBe(1);

    serviceA.dispose();
    serviceB.dispose();
  });

  it('mounts two full BreedingModal Vue components, taps Conectar, opens live Logs P2P, exchanges creatures and completes breeding', async () => {
    const sim = createNearbyRadioSimulator();

    const transportA = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-z-ui-a',
      playerName: 'Jogador A',
      isNativeOverride: true,
      pluginOverride: sim.createPluginForDevice('uiPhoneA')
    });
    const transportB = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-a-ui-b',
      playerName: 'Jogador B',
      isNativeOverride: true,
      pluginOverride: sim.createPluginForDevice('uiPhoneB')
    });

    const baseA = createNewGameSaveSnapshot(1000, 'solassauro');
    const saveA = {
      ...baseA,
      characters: {
        ...baseA.characters,
        solassauro: {
          ...baseA.characters.solassauro,
          genetics: maleSol
        }
      }
    };

    const baseB = createNewGameSaveSnapshot(1000, 'terrassauro');
    const saveB = {
      ...baseB,
      characters: {
        ...baseB.characters,
        terrassauro: {
          ...baseB.characters.terrassauro,
          genetics: femaleAqua
        }
      }
    };

    const wrapperA = mount(BreedingModal, {
      props: { saveSnapshot: saveA, transportOverride: transportA },
      global: { stubs: { BreedingAnimationCanvas: true } }
    });
    const wrapperB = mount(BreedingModal, {
      props: { saveSnapshot: saveB, transportOverride: transportB },
      global: { stubs: { BreedingAnimationCanvas: true } }
    });

    // Click "Conectar" on both screens
    await wrapperA.get('[data-testid="p2p-connect-btn"]').trigger('click');
    await wrapperB.get('[data-testid="p2p-connect-btn"]').trigger('click');

    // Toggle P2P logs panel open on Device A
    await wrapperA.get('[data-testid="p2p-logs-toggle-btn"]').trigger('click');
    expect(wrapperA.find('[data-testid="p2p-diagnostic-logs"]').exists()).toBe(true);

    // Wait for async Nearby discovery + pairing + auth + handshake + CHARACTER_SELECT
    await vi.waitFor(
      async () => {
        await nextTick();
        expect(wrapperA.text()).toContain('Parceiro Conectado!');
        expect(wrapperB.text()).toContain('Parceiro Conectado!');
        expect(wrapperA.text()).toContain('terrassauro');
        expect(wrapperB.text()).toContain('solassauro');
        expect(wrapperA.text()).toContain('Cruzamento Geneticamente Compatível');
        expect(wrapperB.text()).toContain('Cruzamento Geneticamente Compatível');
      },
      { timeout: 3000 }
    );
    expect(wrapperA.get('[data-testid="p2p-diagnostic-logs"]').text()).toContain('CHARACTER_SELECT');

    // Both click "Confirmar & Iniciar Reprodução"
    const confirmBtnA = wrapperA.get('[data-testid="confirm-breeding-btn"]');
    const confirmBtnB = wrapperB.get('[data-testid="confirm-breeding-btn"]');
    expect(confirmBtnA.attributes('disabled')).toBeUndefined();
    expect(confirmBtnB.attributes('disabled')).toBeUndefined();

    await confirmBtnA.trigger('click');
    await confirmBtnB.trigger('click');

    await vi.waitFor(
      async () => {
        await nextTick();
        expect(wrapperA.emitted('update-save')?.length).toBeGreaterThanOrEqual(1);
        expect(wrapperB.emitted('update-save')?.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );

    // Sync emitted saves back into both wrappers (as VirtualCreaturesGame.vue does in production!)
    const updatedA = (wrapperA.emitted('update-save') as GameSaveSnapshot[][])[0][0];
    const updatedB = (wrapperB.emitted('update-save') as GameSaveSnapshot[][])[0][0];
    await wrapperA.setProps({ saveSnapshot: updatedA });
    await wrapperB.setProps({ saveSnapshot: updatedB });

    // Exactly one wrapper won the egg; verify post-breeding CTA works cleanly and winner can incubate its real P2P egg!
    const winnerWrapper = updatedA.incubator.length > 0 ? wrapperA : wrapperB;
    const winnerSave = updatedA.incubator.length > 0 ? updatedA : updatedB;
    const loserWrapper = updatedA.incubator.length > 0 ? wrapperB : wrapperA;
    const wonEggId = winnerSave.incubator[0].id;
    expect(winnerSave.incubator[0].ownerId).toBe('local-player');

    expect(winnerWrapper.find('[data-testid="breeding-egg-created-card"]').exists()).toBe(true);
    expect(loserWrapper.find('[data-testid="breeding-partner-won-card"]').exists()).toBe(true);

    // Clicking post-breeding CTA incubates the P2P-won egg immediately and switches to Nursery!
    await winnerWrapper.get('[data-testid="post-breeding-incubate-btn"]').trigger('click');
    const winnerUpdates = winnerWrapper.emitted('update-save') as GameSaveSnapshot[][];
    const afterIncubateStart = winnerUpdates[winnerUpdates.length - 1][0];
    expect(resolveEggStatus(afterIncubateStart.incubator[0])).toBe('incubating');
    await winnerWrapper.setProps({ saveSnapshot: afterIncubateStart });
    expect(winnerWrapper.find('[data-testid="nursery-tab-panel"]').exists()).toBe(true);
    expect(winnerWrapper.get(`[data-testid="egg-status-${wonEggId}"]`).text()).toContain('Incubando');

    // Non-winner can reset for a new breeding session cleanly without invalid state transition
    await loserWrapper.get('[data-testid="new-breeding-session-btn"]').trigger('click');
    expect(loserWrapper.find('[data-testid="p2p-connect-btn"]').exists()).toBe(true);

    wrapperA.unmount();
    wrapperB.unmount();
  });

  it('handles simultaneous manual pairing across different room codes and out-of-order payload arrival', async () => {
    const sim = createNearbyRadioSimulator();
    const pluginA = sim.createPluginForDevice('clashA');
    const pluginB = sim.createPluginForDevice('clashB');

    const transportA = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-clash-a',
      playerName: 'Jogador Clash A',
      isNativeOverride: true,
      pluginOverride: pluginA
    });
    const transportB = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-clash-b',
      playerName: 'Jogador Clash B',
      isNativeOverride: true,
      pluginOverride: pluginB
    });

    const serviceA = new BreedingService(transportA);
    const serviceB = new BreedingService(transportB);

    serviceA.selectLocalCreature('solassauro', maleSol, 'Treinador A');
    serviceB.selectLocalCreature('terrassauro', femaleAqua, 'Treinador B');

    // Different room codes so auto-connect does not fire
    await serviceA.openDiscovery('SALA-111');
    await serviceB.openDiscovery('SALA-222');

    await vi.waitFor(() => {
      expect(transportA.getDiscoveredPeers()).toHaveLength(1);
      expect(transportB.getDiscoveredPeers()).toHaveLength(1);
    }, { timeout: 3000 });

    // Both tap manual Parear simultaneously
    await Promise.all([
      transportA.connectToPeer('ep-for-clashB'),
      transportB.connectToPeer('ep-for-clashA')
    ]);

    await vi.waitFor(() => {
      expect(transportA.getConnectionStatus()).toBe('connected');
      expect(transportB.getConnectionStatus()).toBe('connected');
      expect(serviceA.getState().remoteParticipant?.characterId).toBe('terrassauro');
      expect(serviceB.getState().remoteParticipant?.characterId).toBe('solassauro');
    }, { timeout: 3000 });

    serviceA.dispose();
    serviceB.dispose();
  });

  it('allows granting permissions in OS dialog on first click or retrying after denial in BreedingModal without restarting APK', async () => {
    const sim = createNearbyRadioSimulator();
    const pluginA = sim.createPluginForDevice('uiRetryA');
    const pluginB = sim.createPluginForDevice('uiRetryB');

    let grantedOnA = false;
    pluginA.checkPermissions = vi.fn().mockImplementation(async () => ({
      granted: grantedOnA,
      missingCount: grantedOnA ? 0 : 2
    }));
    pluginA.requestPermissions = vi
      .fn()
      // 1st click: user denies permission
      .mockResolvedValueOnce({ granted: false, missingCount: 2 })
      // 2nd click ("Tentar Novamente"): user grants permission in same session without restarting APK
      .mockImplementationOnce(async () => {
        grantedOnA = true;
        return { granted: true, missingCount: 0 };
      });

    const transportA = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-ui-retry-a',
      playerName: 'Treinador Retry A',
      isNativeOverride: true,
      pluginOverride: pluginA,
      postGrantRetryDelayMs: 0
    });
    const transportB = new NearbyConnectionsP2PAdapter({
      localPeerId: 'peer-ui-retry-b',
      playerName: 'Treinador Retry B',
      isNativeOverride: true,
      pluginOverride: pluginB,
      postGrantRetryDelayMs: 0
    });

    const baseA = createNewGameSaveSnapshot(1000, 'solassauro');
    const saveA = {
      ...baseA,
      characters: {
        ...baseA.characters,
        solassauro: {
          ...baseA.characters.solassauro,
          genetics: maleSol
        }
      }
    };

    const baseB = createNewGameSaveSnapshot(1000, 'terrassauro');
    const saveB = {
      ...baseB,
      characters: {
        ...baseB.characters,
        terrassauro: {
          ...baseB.characters.terrassauro,
          genetics: femaleAqua
        }
      }
    };

    const wrapperA = mount(BreedingModal, {
      props: { saveSnapshot: saveA, transportOverride: transportA },
      global: { stubs: { BreedingAnimationCanvas: true } }
    });
    const wrapperB = mount(BreedingModal, {
      props: { saveSnapshot: saveB, transportOverride: transportB },
      global: { stubs: { BreedingAnimationCanvas: true } }
    });

    // 1st click on A denies permission -> error banner displayed cleanly
    await wrapperA.get('[data-testid="p2p-connect-btn"]').trigger('click');
    await vi.waitFor(
      async () => {
        await nextTick();
        expect(wrapperA.find('[data-testid="connection-error-banner"]').exists()).toBe(true);
        expect(wrapperA.get('[data-testid="p2p-connect-btn"]').text()).toContain('Tentar Novamente');
      },
      { timeout: 3000 }
    );

    // 2nd click ("Tentar Novamente") grants permission and connects to B immediately without remounting/restarting
    await wrapperB.get('[data-testid="p2p-connect-btn"]').trigger('click');
    await wrapperA.get('[data-testid="p2p-connect-btn"]').trigger('click');

    await vi.waitFor(
      async () => {
        await nextTick();
        expect(wrapperA.text()).toContain('Parceiro Conectado!');
        expect(wrapperB.text()).toContain('Parceiro Conectado!');
      },
      { timeout: 3000 }
    );

    wrapperA.unmount();
    wrapperB.unmount();
  });

  it('completes the real egg nursery UI lifecycle from available -> incubating -> ready -> hatched baby without losing egg or parent', async () => {
    const base = createNewGameSaveSnapshot(1000, 'ignisauro');
    const sire = createGenesisGenome('ignisauro', 'male', 1000, 'sire-modal');
    const dam = createGenesisGenome('terrassauro', 'female', 1000, 'dam-modal');
    const childGenome = crossGenomes(sire, dam, 2000, {}, 'child-modal');

    const parentAdult = {
      ...base.characters.ignisauro,
      runtime: {
        ...base.characters.ignisauro.runtime,
        currentStage: 'adulto' as const,
        ageHours: 500
      },
      genetics: sire
    };

    const initialSave: GameSaveSnapshot = {
      ...base,
      characters: {
        ...base.characters,
        ignisauro: parentAdult
      },
      incubator: [
        {
          id: 'egg-ui-1',
          ownerId: 'local-player',
          genome: childGenome,
          targetSpecies: childGenome.species,
          status: 'available',
          incubationProgress: 0,
          maxIncubationHours: 1 / 60, // 1 minute = 2 warms of 30s!
          isWarm: true,
          createdAtMs: 2000,
          isReadyToHatch: false
        }
      ]
    };

    let currentSave = initialSave;
    const sim = createNearbyRadioSimulator();
    const wrapper = mount(BreedingModal, {
      props: {
        saveSnapshot: currentSave,
        initialSubtab: 'nursery',
        transportOverride: new NearbyConnectionsP2PAdapter({
          localPeerId: 'nursery-peer',
          isNativeOverride: true,
          pluginOverride: sim.createPluginForDevice('nurseryUi')
        })
      },
      global: { stubs: { BreedingAnimationCanvas: true } }
    });

    expect(wrapper.get('[data-testid="egg-status-egg-ui-1"]').text()).toContain('Disponível');

    // Step 1: Start incubation -> egg stays present and switches to Incubando
    await wrapper.get('[data-testid="start-incubation-btn-egg-ui-1"]').trigger('click');
    const updates = wrapper.emitted('update-save') as GameSaveSnapshot[][];
    currentSave = updates[updates.length - 1][0];
    await wrapper.setProps({ saveSnapshot: currentSave });

    expect(currentSave.incubator).toHaveLength(1);
    expect(resolveEggStatus(currentSave.incubator[0])).toBe('incubating');
    expect(wrapper.get('[data-testid="egg-status-egg-ui-1"]').text()).toContain('Incubando');

    // Step 2: Warm egg twice (+30s each) until Ready to Hatch
    await wrapper.get('[data-testid="warm-egg-btn-egg-ui-1"]').trigger('click');
    currentSave = updates[updates.length - 1][0];
    await wrapper.setProps({ saveSnapshot: currentSave });

    await wrapper.get('[data-testid="warm-egg-btn-egg-ui-1"]').trigger('click');
    currentSave = updates[updates.length - 1][0];
    await wrapper.setProps({ saveSnapshot: currentSave });
    expect(wrapper.get('[data-testid="egg-status-egg-ui-1"]').text()).toContain('Pronto');

    // Step 3: Open hatch confirmation, enter nickname, and confirm birth
    await wrapper.get('[data-testid="hatch-ready-btn-egg-ui-1"]').trigger('click');
    expect(wrapper.find('[data-testid="hatch-confirm-box-egg-ui-1"]').exists()).toBe(true);
    await wrapper.get('[data-testid="hatch-nickname-input-egg-ui-1"]').setValue('Brotinho');
    await wrapper.get('[data-testid="confirm-hatch-btn-egg-ui-1"]').trigger('click');
    currentSave = updates[updates.length - 1][0];
    await wrapper.setProps({ saveSnapshot: currentSave });

    // Verify baby created in collection, parent preserved, and hatched egg logged in registry
    expect(wrapper.find('[data-testid="hatch-celebration-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="hatched-egg-record-egg-ui-1"]').exists()).toBe(true);
    expect(currentSave.characters.ignisauro.runtime.currentStage).toBe('adulto');
    const createdCreatureId = currentSave.incubator[0].hatchedCreatureId!;
    expect(currentSave.collection?.[createdCreatureId]?.runtime.currentStage).toBe('baby');
    expect(currentSave.collection?.[createdCreatureId]?.runtime.customNickname).toBe('Brotinho');

    // Step 4: Navigate to care for the newborn baby via celebration button and hatched registry button
    await wrapper.get('[data-testid="go-to-hatched-baby-btn"]').trigger('click');
    expect(wrapper.emitted('focus-creature')?.[0]).toEqual([createdCreatureId]);
    await wrapper.get('[data-testid="focus-hatched-record-btn-egg-ui-1"]').trigger('click');
    expect(wrapper.emitted('focus-creature')?.[1]).toEqual([createdCreatureId]);

    wrapper.unmount();
  });
});
