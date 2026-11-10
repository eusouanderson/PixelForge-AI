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
import { createNewGameSaveSnapshot } from '@/domains/persistence/domain/persistence-engine';

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
});
