import { describe, it, expect, vi } from 'vitest';
import {
  NearbyConnectionsP2PAdapter,
  PROTOCOL_VERSION,
  APP_IDENTIFIER,
  normalizeNearbyError,
  type NearbyConnectionsPluginInterface
} from '../infrastructure/nearby-connections-adapter';
import type { P2PMessage } from '../types';

function createMockPlugin(): NearbyConnectionsPluginInterface & {
  listeners: Record<string, Array<(data: unknown) => void>>;
  trigger: (event: string, data: unknown) => void;
} {
  const listeners: Record<string, Array<(data: unknown) => void>> = {};

  return {
    listeners,
    trigger(event: string, data: unknown) {
      if (listeners[event]) {
        for (const fn of listeners[event]) {
          fn(data);
        }
      }
    },
    isAvailable: vi.fn().mockResolvedValue({ available: true, statusCode: 0 }),
    checkPermissions: vi.fn().mockResolvedValue({ granted: true, missingCount: 0 }),
    requestPermissions: vi.fn().mockResolvedValue({ granted: true, missingCount: 0 }),
    startAdvertising: vi.fn().mockResolvedValue({ success: true }),
    stopAdvertising: vi.fn().mockResolvedValue({ success: true }),
    startDiscovery: vi.fn().mockResolvedValue({ success: true }),
    stopDiscovery: vi.fn().mockResolvedValue({ success: true }),
    requestConnection: vi.fn().mockResolvedValue({ success: true }),
    acceptConnection: vi.fn().mockResolvedValue({ success: true }),
    rejectConnection: vi.fn().mockResolvedValue({ success: true }),
    sendPayload: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    stopAllEndpoints: vi.fn().mockResolvedValue({ success: true }),
    addListener: vi.fn().mockImplementation((event: string, fn: (data: unknown) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return Promise.resolve({
        remove: () => {
          listeners[event] = listeners[event].filter((f) => f !== fn);
          return Promise.resolve();
        }
      });
    }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined)
  };
}

describe('NearbyConnectionsP2PAdapter', () => {
  it('normalizes Error instances and non-Error primitives', () => {
    const errObj = new Error('Erro nativo');
    expect(normalizeNearbyError(errObj)).toBe(errObj);
    expect(normalizeNearbyError('Erro em string').message).toBe('Erro em string');
  });

  describe('Web & Non-native Fallback Mode', () => {
    it('initializes with default options when none are passed', () => {
      const adapter = new NearbyConnectionsP2PAdapter();
      expect(adapter.localPeerId).toMatch(/^peer-/);
      expect(adapter.playerName).toBe('Treinador Pixel');
      expect(adapter.getConnectionStatus()).toBe('idle');
      adapter.disconnect();
    });

    it('initializes and connects cleanly through BroadcastChannel fallback', async () => {
      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'web-peer-1',
        isNativeOverride: false
      });

      expect(adapter.getConnectionStatus()).toBe('idle');
      expect(await adapter.isNearbyAvailable()).toBe(false);
      expect(await adapter.checkAndRequestPermissions()).toBe(true);
      expect(adapter.getDiscoveredPeers()).toEqual([]);
      expect(adapter.getActiveEndpointId()).toBeNull();

      await adapter.connect('room-web-99');
      expect(adapter.getConnectionStatus()).toBe('connected');
      expect(adapter.isSessionAuthenticated()).toBe(true);

      const received: P2PMessage[] = [];
      const unsub = adapter.onMessage((msg) => received.push(msg));

      adapter.send({
        type: 'HANDSHAKE',
        senderId: 'web-peer-1',
        sessionId: 'room-web-99',
        payload: { action: 'TEST' },
        timestampMs: Date.now()
      });

      unsub();
      adapter.disconnect();
      expect(adapter.getConnectionStatus()).toBe('idle');
    });

    it('propagates fallback errors to error handlers', () => {
      const adapter = new NearbyConnectionsP2PAdapter({ isNativeOverride: false });
      const errorLog: string[] = [];
      adapter.onError((e) => errorLog.push(e.message));

      // Simulate fallback adapter error
      const fallback = (adapter as unknown as { fallbackAdapter: { errorHandlers: Array<(e: Error) => void> } }).fallbackAdapter;
      for (const handler of fallback.errorHandlers) {
        handler(new Error('Simulated BroadcastChannel Error'));
      }

      expect(errorLog).toContain('Simulated BroadcastChannel Error');
      expect(adapter.getConnectionStatus()).toBe('failed');
    });

    it('unsubscribes listeners without errors and receives active events', () => {
      const adapter = new NearbyConnectionsP2PAdapter({ isNativeOverride: false });
      const statusLog: string[] = [];
      const peersLog: number[] = [];
      const errorLog: string[] = [];

      const unsubStatus = adapter.onStatusChange((s) => statusLog.push(s));
      const unsubPeers = adapter.onPeersChange((p) => peersLog.push(p.length));
      const unsubErr = adapter.onError((e) => errorLog.push(e.message));

      expect(statusLog).toContain('idle');
      expect(peersLog).toContain(0);

      // Trigger status transition and peer update to test active handlers
      const internal = adapter as unknown as {
        setStatus: (s: string) => void;
        updateDiscoveredPeers: (p: unknown[]) => void;
        handleIncomingMessage: (msg: unknown) => void;
        fallbackAdapter: { messageHandlers: Array<(m: unknown) => void> };
      };

      internal.setStatus('discovering');
      expect(statusLog).toContain('discovering');

      internal.updateDiscoveredPeers([{
        endpointId: 'p1',
        peerId: 'p1',
        playerName: 'Dino',
        protocolVersion: '1.2.0',
        discoveredAtMs: 123
      }]);
      expect(peersLog).toContain(1);

      // Trigger fallback message handler (line 72)
      const received: unknown[] = [];
      adapter.onMessage((m) => received.push(m));
      for (const fn of internal.fallbackAdapter.messageHandlers) {
        fn({
          type: 'HANDSHAKE',
          senderId: 'remote',
          sessionId: 's1',
          payload: {},
          timestampMs: 123
        });
      }
      expect(received).toHaveLength(1);

      unsubStatus();
      unsubPeers();
      unsubErr();
    });
  });

  describe('Native Android Mode with Mock Plugin', () => {
    it('verifies availability and permission handling with recovery', async () => {
      const mockPlugin = createMockPlugin();
      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'android-peer-1',
        isNativeOverride: true,
        pluginOverride: mockPlugin
      });

      expect(await adapter.isNearbyAvailable()).toBe(true);

      // Check permission when already granted
      expect(await adapter.checkAndRequestPermissions()).toBe(true);

      // Check permission when initially missing then granted
      mockPlugin.checkPermissions = vi.fn().mockResolvedValueOnce({ granted: false, missingCount: 2 });
      mockPlugin.requestPermissions = vi.fn().mockResolvedValueOnce({ granted: true, missingCount: 0 });
      expect(await adapter.checkAndRequestPermissions()).toBe(true);

      // Failure in permissions check throws and emits error
      const errSpy = vi.fn();
      adapter.onError(errSpy);
      mockPlugin.checkPermissions = vi.fn().mockRejectedValueOnce(new Error('Bluetooth desativado no SO'));
      expect(await adapter.checkAndRequestPermissions()).toBe(false);
      expect(errSpy).toHaveBeenCalledWith(expect.any(Error));

      // isAvailable catch block
      mockPlugin.isAvailable = vi.fn().mockRejectedValueOnce(new Error('Play Services indisponível'));
      expect(await adapter.isNearbyAvailable()).toBe(false);
    });

    it('handles connection failure if permissions are denied', async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.checkPermissions = vi.fn().mockResolvedValue({ granted: false });
      mockPlugin.requestPermissions = vi.fn().mockResolvedValue({ granted: false });

      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'android-peer-1',
        isNativeOverride: true,
        pluginOverride: mockPlugin
      });

      const errSpy = vi.fn();
      adapter.onError(errSpy);

      await adapter.connect('room-123');
      expect(errSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Permissões de Nearby / Bluetooth não concedidas.' })
      );
      expect(adapter.getConnectionStatus()).toBe('failed');
    });

    it('starts discovery and advertising on connect, handling errors', async () => {
      const mockPlugin = createMockPlugin();
      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'android-peer-1',
        playerName: 'Ash Dino',
        isNativeOverride: true,
        pluginOverride: mockPlugin
      });

      await adapter.connect('room-dino-77');
      expect(mockPlugin.startAdvertising).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointName: expect.stringContaining('Ash Dino')
        })
      );
      expect(mockPlugin.startDiscovery).toHaveBeenCalled();
      expect(adapter.getConnectionStatus()).toBe('discovering');

      // Advertising error test
      const errSpy = vi.fn();
      adapter.onError(errSpy);
      mockPlugin.startAdvertising = vi.fn().mockRejectedValueOnce(new Error('Rádio Bluetooth ocupado'));
      await adapter.connect('room-dino-77');
      expect(errSpy).toHaveBeenCalledWith(expect.any(Error));

      // Discovery error test with non-Error string
      mockPlugin.startAdvertising = vi.fn().mockResolvedValueOnce({ success: true });
      mockPlugin.startDiscovery = vi.fn().mockRejectedValueOnce('Falha genérica de rádio');
      await adapter.connect('room-dino-77');
      expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('discovers peers with matching and non-matching channels, including updates and endpoint lost', async () => {
      const mockPlugin = createMockPlugin();
      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'local-peer-1',
        isNativeOverride: true,
        pluginOverride: mockPlugin
      });

      await adapter.connect('room-match-1');

      // Ignore self peerId
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-self',
        endpointName: JSON.stringify({
          peerId: 'local-peer-1',
          playerName: 'Self',
          version: PROTOCOL_VERSION
        })
      });
      expect(adapter.getDiscoveredPeers()).toHaveLength(0);

      // Discovery of another peer with matching channel -> auto-connect
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-remote-1',
        endpointName: JSON.stringify({
          peerId: 'remote-peer-1',
          playerName: 'Gary Oak',
          version: PROTOCOL_VERSION,
          channel: 'room-match-1'
        })
      });

      expect(adapter.getDiscoveredPeers()).toHaveLength(1);
      expect(adapter.getDiscoveredPeers()[0].playerName).toBe('Gary Oak');
      expect(mockPlugin.requestConnection).toHaveBeenCalledWith(
        expect.objectContaining({ endpointId: 'ep-remote-1' })
      );

      // Update existing peer record
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-remote-1',
        endpointName: JSON.stringify({
          peerId: 'remote-peer-1',
          playerName: 'Gary Oak (Pro)',
          version: PROTOCOL_VERSION,
          channel: 'room-match-1'
        })
      });
      expect(adapter.getDiscoveredPeers()[0].playerName).toBe('Gary Oak (Pro)');

      // JSON without playerName, version, and with different channel
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-diff-channel',
        endpointName: JSON.stringify({
          peerId: 'remote-peer-diff',
          channel: 'other-channel'
        })
      });
      const diffPeer = adapter.getDiscoveredPeers().find((p) => p.peerId === 'remote-peer-diff');
      expect(diffPeer?.playerName).toBe('Treinador Próximo');
      expect(diffPeer?.protocolVersion).toBe('1.0.0');

      // JSON without peerId is ignored
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-no-peer',
        endpointName: JSON.stringify({
          somethingElse: true
        })
      });

      // Non-JSON endpoint name with empty string fallback
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-empty-name',
        endpointName: ''
      });
      const emptyNamePeer = adapter.getDiscoveredPeers().find((p) => p.endpointId === 'ep-empty-name');
      expect(emptyNamePeer?.playerName).toBe('Jogador Próximo');

      // Non-JSON endpoint name fallback
      mockPlugin.trigger('onEndpointFound', {
        endpointId: 'ep-legacy-2',
        endpointName: 'Legacy Dino Player'
      });
      expect(adapter.getDiscoveredPeers()).toHaveLength(4);

      // Endpoint lost
      mockPlugin.trigger('onEndpointLost', { endpointId: 'ep-legacy-2' });
      expect(adapter.getDiscoveredPeers()).toHaveLength(3);
    });

    it('performs mutual session challenge-response authentication and message payload exchange', async () => {
      const mockPlugin = createMockPlugin();
      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'local-peer-1',
        isNativeOverride: true,
        pluginOverride: mockPlugin
      });

      await adapter.connect('room-auth-1');

      // Incoming connection initiated -> auto-accept
      mockPlugin.trigger('onConnectionInitiated', {
        endpointId: 'ep-100',
        endpointName: 'Peer Remote',
        isIncoming: true
      });
      expect(mockPlugin.acceptConnection).toHaveBeenCalledWith({ endpointId: 'ep-100' });

      // Connection result OK -> triggers auth challenge
      mockPlugin.trigger('onConnectionResult', {
        endpointId: 'ep-100',
        success: true
      });
      expect(adapter.getActiveEndpointId()).toBe('ep-100');
      expect(adapter.getConnectionStatus()).toBe('authenticating');

      // Verify payload was sent to peer
      expect(mockPlugin.sendPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointId: 'ep-100',
          payload: expect.stringContaining('SESSION_AUTH_CHALLENGE')
        })
      );

      // Invalid appIdentifier in incoming challenge is ignored
      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-100',
        payload: JSON.stringify({
          type: 'SESSION_AUTH_CHALLENGE',
          senderId: 'remote-peer-1',
          sessionId: 'room-auth-1',
          payload: {
            appIdentifier: 'other.invalid.app',
            protocolVersion: PROTOCOL_VERSION,
            challengeNonce: 'nonce'
          },
          timestampMs: Date.now()
        })
      });

      // Invalid responseNonce or appIdentifier in response is ignored
      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-100',
        payload: JSON.stringify({
          type: 'SESSION_AUTH_RESPONSE',
          senderId: 'remote-peer-1',
          sessionId: 'room-auth-1',
          payload: {
            appIdentifier: 'other.invalid.app',
            protocolVersion: PROTOCOL_VERSION,
            responseNonce: 'wrong'
          },
          timestampMs: Date.now()
        })
      });
      expect(adapter.isSessionAuthenticated()).toBe(false);

      // Simulate remote responding to our challenge correctly
      const lastPayloadCall = (mockPlugin.sendPayload as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastPayloadCall).toBeDefined();
      const parsedSent = JSON.parse(lastPayloadCall![0].payload) as { payload: { challengeNonce: string } };
      const receivedNonce = parsedSent.payload.challengeNonce;

      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-100',
        payload: JSON.stringify({
          type: 'SESSION_AUTH_RESPONSE',
          senderId: 'remote-peer-1',
          sessionId: 'room-auth-1',
          payload: {
            appIdentifier: APP_IDENTIFIER,
            protocolVersion: PROTOCOL_VERSION,
            responseNonce: `${receivedNonce}-verified-remotenonce`
          },
          timestampMs: Date.now()
        })
      });

      expect(adapter.isSessionAuthenticated()).toBe(true);
      expect(adapter.getConnectionStatus()).toBe('connected');

      // Simulate incoming remote challenge to which local must respond
      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-100',
        payload: JSON.stringify({
          type: 'SESSION_AUTH_CHALLENGE',
          senderId: 'remote-peer-1',
          sessionId: 'room-auth-1',
          payload: {
            appIdentifier: APP_IDENTIFIER,
            protocolVersion: PROTOCOL_VERSION,
            challengeNonce: 'remote-nonce-123'
          },
          timestampMs: Date.now()
        })
      });

      // Local responds with SESSION_AUTH_RESPONSE
      expect(mockPlugin.sendPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointId: 'ep-100',
          payload: expect.stringContaining('SESSION_AUTH_RESPONSE')
        })
      );

      // Handles SESSION_AUTHENTICATED confirmation
      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-100',
        payload: JSON.stringify({
          type: 'SESSION_AUTHENTICATED',
          senderId: 'remote-peer-1',
          sessionId: 'room-auth-1',
          payload: { success: true },
          timestampMs: Date.now()
        })
      });
      expect(adapter.isSessionAuthenticated()).toBe(true);

      // Handles application messages
      const appMsgSpy = vi.fn();
      adapter.onMessage(appMsgSpy);
      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-100',
        payload: JSON.stringify({
          type: 'CHARACTER_SELECT',
          senderId: 'remote-peer-1',
          sessionId: 'room-auth-1',
          payload: { peerId: 'remote-peer-1' },
          timestampMs: Date.now()
        })
      });
      expect(appMsgSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CHARACTER_SELECT' })
      );

      // Send before active endpoint is established (hits fallback send in native mode)
      adapter.send({
        type: 'HEARTBEAT',
        senderId: 'local-peer-1',
        sessionId: 'room-auth-1',
        payload: {},
        timestampMs: Date.now()
      });

      // Disconnect event for different endpoint (ignored)
      mockPlugin.trigger('onDisconnected', { endpointId: 'ep-not-active' });
      expect(adapter.getActiveEndpointId()).toBe('ep-100');

      // Disconnect event
      mockPlugin.trigger('onDisconnected', { endpointId: 'ep-100' });
      expect(adapter.getActiveEndpointId()).toBeNull();
      expect(adapter.getConnectionStatus()).toBe('disconnected');

      // Native disconnect method test
      adapter.disconnect();
      expect(mockPlugin.stopAllEndpoints).toHaveBeenCalled();
      expect(adapter.getConnectionStatus()).toBe('idle');
    });

    it('handles connection rejection and errors in connection methods', async () => {
      const mockPlugin = createMockPlugin();
      const adapter = new NearbyConnectionsP2PAdapter({
        localPeerId: 'local-peer-1',
        isNativeOverride: true,
        pluginOverride: mockPlugin
      });

      const errSpy = vi.fn();
      adapter.onError(errSpy);

      await adapter.connect('room-errors');

      // Connection result failure
      mockPlugin.trigger('onConnectionResult', {
        endpointId: 'ep-failed',
        success: false
      });
      expect(errSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Conexão P2P rejeitada ou falhou no emparelhamento.' })
      );

      // Malformed payload error
      mockPlugin.trigger('onPayloadReceived', {
        endpointId: 'ep-failed',
        payload: 'not a valid json {<'
      });
      expect(errSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Falha ao decodificar pacote de dados Nearby.' })
      );

      // Connection methods reject handling
      mockPlugin.requestConnection = vi.fn().mockRejectedValueOnce(new Error('Falha no handshake'));
      await adapter.connectToPeer('ep-1');
      expect(errSpy).toHaveBeenCalledWith(expect.any(Error));

      mockPlugin.acceptConnection = vi.fn().mockRejectedValueOnce(new Error('Erro ao aceitar'));
      await adapter.acceptConnection('ep-1');
      expect(errSpy).toHaveBeenCalledWith(expect.any(Error));

      mockPlugin.rejectConnection = vi.fn().mockRejectedValueOnce(new Error('Erro ao rejeitar'));
      await adapter.rejectConnection('ep-1');
      expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
