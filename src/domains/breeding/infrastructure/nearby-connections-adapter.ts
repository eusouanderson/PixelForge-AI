import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
  DiscoveredPeer,
  NearbyConnectionStatus,
  P2PMessage,
  P2PTransportPort
} from '../types';
import { transitionConnectionStatus } from '../domain/connection-state-machine';
import { BroadcastChannelP2PAdapter } from './p2p-channel-adapter';

export const PROTOCOL_VERSION = '1.2.0';
export const APP_IDENTIFIER = 'ai.pixelforge.virtualcreatures';

export function normalizeNearbyError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

export interface NearbyConnectionsPluginInterface {
  isAvailable(): Promise<{ available: boolean; statusCode?: number; reason?: string }>;
  checkPermissions(): Promise<{ granted: boolean; missingCount?: number }>;
  requestPermissions(): Promise<{ granted: boolean; missingCount?: number }>;
  startAdvertising(options: { endpointName: string; serviceId?: string }): Promise<{ success: boolean }>;
  stopAdvertising(): Promise<{ success: boolean }>;
  startDiscovery(options?: { serviceId?: string }): Promise<{ success: boolean }>;
  stopDiscovery(): Promise<{ success: boolean }>;
  requestConnection(options: { endpointId: string; endpointName: string }): Promise<{ success: boolean }>;
  acceptConnection(options: { endpointId: string }): Promise<{ success: boolean }>;
  rejectConnection(options: { endpointId: string }): Promise<{ success: boolean }>;
  sendPayload(options: { endpointId: string; payload: string }): Promise<{ success: boolean }>;
  disconnect(options?: { endpointId?: string }): Promise<{ success: boolean }>;
  stopAllEndpoints(): Promise<{ success: boolean }>;
  addListener(eventName: string, listenerFunc: (data: unknown) => void): Promise<{ remove: () => Promise<void> }>;
  removeAllListeners(): Promise<void>;
}

export const NearbyConnections = registerPlugin<NearbyConnectionsPluginInterface>('NearbyConnections');

export interface NearbyAdapterOptions {
  readonly localPeerId?: string;
  readonly playerName?: string;
  readonly pluginOverride?: NearbyConnectionsPluginInterface;
  readonly isNativeOverride?: boolean;
}

export class NearbyConnectionsP2PAdapter implements P2PTransportPort {
  public readonly localPeerId: string;
  public readonly playerName: string;

  private status: NearbyConnectionStatus = 'idle';
  private discoveredPeers: DiscoveredPeer[] = [];
  private activeEndpointId: string | null = null;
  private pendingConnectingEndpointId: string | null = null;
  private messageHandlers: Array<(msg: P2PMessage) => void> = [];
  private errorHandlers: Array<(err: Error) => void> = [];
  private statusHandlers: Array<(status: NearbyConnectionStatus) => void> = [];
  private peersHandlers: Array<(peers: readonly DiscoveredPeer[]) => void> = [];

  private sequenceCounter = 0;
  private currentSessionId = '';
  private authNonce = '';
  private isAuthenticated = false;

  private readonly isNative: boolean;
  private readonly plugin: NearbyConnectionsPluginInterface;
  private readonly fallbackAdapter: BroadcastChannelP2PAdapter;
  private pluginListeners: Array<{ remove: () => Promise<void> }> = [];

  constructor(options: NearbyAdapterOptions = {}) {
    this.localPeerId = options.localPeerId ?? `peer-${Math.random().toString(36).slice(2, 9)}`;
    this.playerName = options.playerName ?? 'Treinador Pixel';
    this.plugin = options.pluginOverride ?? NearbyConnections;
    this.isNative = options.isNativeOverride ?? (Capacitor.getPlatform() === 'android');
    this.fallbackAdapter = new BroadcastChannelP2PAdapter(this.localPeerId);

    // Forward fallback messages when running on web
    this.fallbackAdapter.onMessage((msg) => {
      this.handleIncomingMessage(msg);
    });
    this.fallbackAdapter.onError((err) => {
      this.emitError(err);
    });
  }

  public getConnectionStatus(): NearbyConnectionStatus {
    return this.status;
  }

  public getDiscoveredPeers(): readonly DiscoveredPeer[] {
    return [...this.discoveredPeers];
  }

  public getActiveEndpointId(): string | null {
    return this.activeEndpointId;
  }

  public getPendingConnectingEndpointId(): string | null {
    return this.pendingConnectingEndpointId;
  }

  public isSessionAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  private setStatus(nextStatus: NearbyConnectionStatus): void {
    if (this.status === nextStatus) return;
    this.status = transitionConnectionStatus(this.status, nextStatus);
    for (const handler of this.statusHandlers) {
      handler(this.status);
    }
  }

  private emitError(err: Error): void {
    this.setStatus('failed');
    for (const handler of this.errorHandlers) {
      handler(err);
    }
  }

  private updateDiscoveredPeers(peers: DiscoveredPeer[]): void {
    this.discoveredPeers = peers;
    for (const handler of this.peersHandlers) {
      handler(this.discoveredPeers);
    }
  }

  public async isNearbyAvailable(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await this.plugin.isAvailable();
      return res.available;
    } catch {
      return false;
    }
  }

  public async checkAndRequestPermissions(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      this.setStatus('checking_environment');
      const check = await this.plugin.checkPermissions();
      if (check.granted) return true;

      this.setStatus('requesting_permissions');
      const req = await this.plugin.requestPermissions();
      return req.granted;
    } catch (e) {
      const err = normalizeNearbyError(e);
      this.emitError(err);
      return false;
    }
  }

  public async connect(channelId: string): Promise<void> {
    this.currentSessionId = channelId;
    this.authNonce = Math.random().toString(36).slice(2, 10);
    this.isAuthenticated = false;

    if (!this.isNative) {
      this.setStatus('discovering');
      await this.fallbackAdapter.connect(channelId);
      this.setStatus('connected');
      this.isAuthenticated = true;
      return;
    }

    const hasPermissions = await this.checkAndRequestPermissions();
    if (!hasPermissions) {
      this.emitError(
        new Error(
          'Permissões de Nearby / Bluetooth não concedidas. Por favor, autorize o acesso a Dispositivos Próximos nas configurações do aparelho.'
        )
      );
      return;
    }

    await this.setupNativeListeners();

    try {
      this.setStatus('starting_discovery');
      const advertisedName = JSON.stringify({
        peerId: this.localPeerId,
        playerName: this.playerName,
        version: PROTOCOL_VERSION,
        channel: channelId
      });

      await this.plugin.startAdvertising({ endpointName: advertisedName });
      await this.plugin.startDiscovery();
      this.setStatus('discovering');
    } catch (e) {
      const err = normalizeNearbyError(e);
      this.emitError(err);
    }
  }

  public async connectToPeer(endpointId: string): Promise<void> {
    if (this.activeEndpointId === endpointId || this.pendingConnectingEndpointId === endpointId) {
      return;
    }
    this.pendingConnectingEndpointId = endpointId;
    this.setStatus('connection_requested');
    const localInfo = JSON.stringify({
      peerId: this.localPeerId,
      playerName: this.playerName,
      version: PROTOCOL_VERSION
    });

    try {
      await this.plugin.requestConnection({ endpointId, endpointName: localInfo });
    } catch (e) {
      const err = normalizeNearbyError(e);
      if (err.message.includes('STATUS_ALREADY_CONNECTED_TO_ENDPOINT') || err.message.includes('8003')) {
        return;
      }
      this.pendingConnectingEndpointId = null;
      this.emitError(err);
    }
  }

  public async acceptConnection(endpointId: string): Promise<void> {
    this.setStatus('connecting');
    try {
      await this.plugin.acceptConnection({ endpointId });
    } catch (e) {
      const err = normalizeNearbyError(e);
      if (err.message.includes('STATUS_ALREADY_CONNECTED_TO_ENDPOINT') || err.message.includes('8003')) {
        return;
      }
      this.emitError(err);
    }
  }

  public async rejectConnection(endpointId: string): Promise<void> {
    try {
      await this.plugin.rejectConnection({ endpointId });
    } catch (e) {
      const err = normalizeNearbyError(e);
      this.emitError(err);
    }
  }

  public disconnect(): void {
    if (this.isNative) {
      void this.plugin.stopAllEndpoints();
      this.cleanupNativeListeners();
    } else {
      this.fallbackAdapter.disconnect();
    }
    this.activeEndpointId = null;
    this.pendingConnectingEndpointId = null;
    this.discoveredPeers = [];
    this.isAuthenticated = false;
    this.setStatus('idle');
  }

  public send(message: P2PMessage): void {
    const enrichedMessage: P2PMessage = {
      protocolVersion: PROTOCOL_VERSION,
      messageId: `msg-${Date.now()}-${++this.sequenceCounter}`,
      sequence: this.sequenceCounter,
      ...message
    };

    if (this.isNative && this.activeEndpointId) {
      const payloadString = JSON.stringify(enrichedMessage);
      void this.plugin.sendPayload({
        endpointId: this.activeEndpointId,
        payload: payloadString
      });
    } else {
      this.fallbackAdapter.send(enrichedMessage);
    }
  }

  public onMessage(handler: (msg: P2PMessage) => void): () => void {
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

  public onStatusChange(handler: (status: NearbyConnectionStatus) => void): () => void {
    this.statusHandlers.push(handler);
    handler(this.status);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  public onPeersChange(handler: (peers: readonly DiscoveredPeer[]) => void): () => void {
    this.peersHandlers.push(handler);
    handler(this.discoveredPeers);
    return () => {
      this.peersHandlers = this.peersHandlers.filter((h) => h !== handler);
    };
  }

  private async setupNativeListeners(): Promise<void> {
    this.cleanupNativeListeners();

    const hFound = await this.plugin.addListener('onEndpointFound', (raw) => {
      const data = raw as { endpointId: string; endpointName: string };
      this.handleEndpointDiscovered(data.endpointId, data.endpointName);
    });
    this.pluginListeners.push(hFound);

    const hLost = await this.plugin.addListener('onEndpointLost', (raw) => {
      const data = raw as { endpointId: string };
      this.updateDiscoveredPeers(this.discoveredPeers.filter((p) => p.endpointId !== data.endpointId));
    });
    this.pluginListeners.push(hLost);

    const hInit = await this.plugin.addListener('onConnectionInitiated', (raw) => {
      const data = raw as { endpointId: string; endpointName: string; isIncoming: boolean };
      this.setStatus('connection_pending');
      // Automatically accept mutual point-to-point connection
      void this.acceptConnection(data.endpointId);
    });
    this.pluginListeners.push(hInit);

    const hResult = await this.plugin.addListener('onConnectionResult', (raw) => {
      const data = raw as { endpointId: string; success: boolean };
      this.pendingConnectingEndpointId = null;
      if (data.success) {
        this.activeEndpointId = data.endpointId;
        this.setStatus('authenticating');
        this.initiateAuthentication();
      } else {
        this.emitError(new Error('Conexão P2P rejeitada ou falhou no emparelhamento.'));
      }
    });
    this.pluginListeners.push(hResult);

    const hDisc = await this.plugin.addListener('onDisconnected', (raw) => {
      const data = raw as { endpointId: string };
      if (this.activeEndpointId === data.endpointId || this.pendingConnectingEndpointId === data.endpointId) {
        this.activeEndpointId = null;
        this.pendingConnectingEndpointId = null;
        this.isAuthenticated = false;
        this.setStatus('disconnected');
      }
    });
    this.pluginListeners.push(hDisc);

    const hPayload = await this.plugin.addListener('onPayloadReceived', (raw) => {
      const data = raw as { endpointId: string; payload: string };
      try {
        const msg = JSON.parse(data.payload) as P2PMessage;
        this.handleIncomingMessage(msg);
      } catch {
        this.emitError(new Error('Falha ao decodificar pacote de dados Nearby.'));
      }
    });
    this.pluginListeners.push(hPayload);
  }

  private cleanupNativeListeners(): void {
    for (const l of this.pluginListeners) {
      void l.remove();
    }
    this.pluginListeners = [];
  }

  private handleEndpointDiscovered(endpointId: string, endpointName: string): void {
    try {
      const parsed = JSON.parse(endpointName) as {
        peerId?: string;
        playerName?: string;
        version?: string;
        channel?: string;
      };

      if (parsed.peerId && parsed.peerId !== this.localPeerId) {
        const peer: DiscoveredPeer = {
          endpointId,
          peerId: parsed.peerId,
          playerName: parsed.playerName ?? 'Treinador Próximo',
          protocolVersion: parsed.version ?? '1.0.0',
          discoveredAtMs: Date.now()
        };

        const existingIndex = this.discoveredPeers.findIndex((p) => p.peerId === peer.peerId);
        const updated = [...this.discoveredPeers];
        if (existingIndex >= 0) {
          updated[existingIndex] = peer;
        } else {
          updated.push(peer);
        }

        this.updateDiscoveredPeers(updated);
        this.setStatus('player_found');

        // If the channel matches, deterministic tie-breaker ensures only ONE device calls requestConnection
        // to prevent simultaneous socket collisions (connection clash) in Google Nearby Connections.
        if (parsed.channel && parsed.channel === this.currentSessionId) {
          if (this.localPeerId > parsed.peerId && !this.activeEndpointId && !this.pendingConnectingEndpointId) {
            void this.connectToPeer(endpointId);
          }
        }
      }
    } catch {
      // Non-JSON endpoint name (e.g. legacy name)
      const peer: DiscoveredPeer = {
        endpointId,
        peerId: endpointId,
        playerName: endpointName || 'Jogador Próximo',
        protocolVersion: '1.0.0',
        discoveredAtMs: Date.now()
      };
      this.updateDiscoveredPeers([...this.discoveredPeers, peer]);
      this.setStatus('player_found');
    }
  }

  private initiateAuthentication(): void {
    this.send({
      type: 'SESSION_AUTH_CHALLENGE',
      senderId: this.localPeerId,
      sessionId: this.currentSessionId,
      payload: {
        appIdentifier: APP_IDENTIFIER,
        protocolVersion: PROTOCOL_VERSION,
        challengeNonce: this.authNonce
      },
      timestampMs: Date.now()
    });
  }

  private handleIncomingMessage(msg: P2PMessage): void {
    // Protocol Authentication layer
    if (msg.type === 'SESSION_AUTH_CHALLENGE') {
      const payload = msg.payload as {
        appIdentifier: string;
        protocolVersion: string;
        challengeNonce: string;
      };

      if (payload.appIdentifier === APP_IDENTIFIER) {
        this.send({
          type: 'SESSION_AUTH_RESPONSE',
          senderId: this.localPeerId,
          sessionId: this.currentSessionId,
          payload: {
            appIdentifier: APP_IDENTIFIER,
            protocolVersion: PROTOCOL_VERSION,
            responseNonce: `${payload.challengeNonce}-verified-${this.authNonce}`
          },
          timestampMs: Date.now()
        });
      }
      return;
    }

    if (msg.type === 'SESSION_AUTH_RESPONSE') {
      const payload = msg.payload as {
        appIdentifier: string;
        protocolVersion: string;
        responseNonce: string;
      };

      if (payload.appIdentifier === APP_IDENTIFIER && payload.responseNonce.startsWith(this.authNonce)) {
        this.isAuthenticated = true;
        this.setStatus('connected');
        this.send({
          type: 'SESSION_AUTHENTICATED',
          senderId: this.localPeerId,
          sessionId: this.currentSessionId,
          payload: { success: true },
          timestampMs: Date.now()
        });
        // Send initial handshake to trigger breeding session
        this.send({
          type: 'HANDSHAKE',
          senderId: this.localPeerId,
          sessionId: this.currentSessionId,
          payload: { action: 'MUTUAL_AUTH_COMPLETED' },
          timestampMs: Date.now()
        });
      }
      return;
    }

    if (msg.type === 'SESSION_AUTHENTICATED') {
      this.isAuthenticated = true;
      this.setStatus('connected');
      this.send({
        type: 'HANDSHAKE',
        senderId: this.localPeerId,
        sessionId: this.currentSessionId,
        payload: { action: 'MUTUAL_AUTH_ACK' },
        timestampMs: Date.now()
      });
      return;
    }

    // Forward application-level messages to breeding service handlers
    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }
}
