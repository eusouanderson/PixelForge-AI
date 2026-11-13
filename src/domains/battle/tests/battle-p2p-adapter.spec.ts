import { describe, it, expect } from 'vitest';
import type { DiscoveredPeer, NearbyConnectionStatus, NearbyDiagnosticLogEntry, P2PMessage, P2PTransportPort } from '@/domains/breeding/types';
import { BattleP2PAdapter } from '../infrastructure/battle-p2p-adapter';
import type { BattleDiagnosticLogEntry, BattleP2PMessage } from '../types';

class MockUnderlyingTransport implements P2PTransportPort {
  public localPeerId = 'peer-underlying';
  public sentMessages: P2PMessage[] = [];
  public messageHandler: ((msg: P2PMessage) => void) | null = null;
  public errorHandler: ((err: Error) => void) | null = null;
  public statusHandler: ((st: NearbyConnectionStatus) => void) | null = null;
  public peersHandler: ((peers: readonly DiscoveredPeer[]) => void) | null = null;
  public connectedPeer: string | null = null;
  public acceptedPeer: string | null = null;
  public rejectedPeer: string | null = null;
  public diagnosticLogs: NearbyDiagnosticLogEntry[] = [];
  public logHandler: ((logs: readonly NearbyDiagnosticLogEntry[]) => void) | null = null;
  public activeEndpointId: string | null = null;
  public getConnectionStatus?: () => NearbyConnectionStatus;

  public async connect(_channelId: string): Promise<void> {}
  public disconnect(): void {}
  public send(message: P2PMessage): void {
    this.sentMessages.push(message);
  }
  public onMessage(handler: (msg: P2PMessage) => void): () => void {
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
  public onStatusChange(handler: (status: NearbyConnectionStatus) => void): () => void {
    this.statusHandler = handler;
    return () => {
      this.statusHandler = null;
    };
  }
  public onPeersChange(handler: (peers: readonly DiscoveredPeer[]) => void): () => void {
    this.peersHandler = handler;
    return () => {
      this.peersHandler = null;
    };
  }
  public async connectToPeer(endpointId: string): Promise<void> {
    this.connectedPeer = endpointId;
  }
  public async acceptConnection(endpointId: string): Promise<void> {
    this.acceptedPeer = endpointId;
  }
  public async rejectConnection(endpointId: string): Promise<void> {
    this.rejectedPeer = endpointId;
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
  public getActiveEndpointId(): string | null {
    return this.activeEndpointId;
  }
}

describe('Battle P2P Adapter', () => {
  it('initializes with default or custom peer id and player name', () => {
    const adapter = new BattleP2PAdapter({
      localPeerId: 'custom-peer',
      playerName: 'Mestre Arena'
    });
    expect(adapter.localPeerId).toBe('custom-peer');
    expect(adapter.playerName).toBe('Mestre Arena');
    expect(adapter.getConnectionStatus()).toBe('idle');
  });

  it('delegates to underlying P2PTransportPort and wraps messages in battleEnvelope', async () => {
    const underlying = new MockUnderlyingTransport();
    const adapter = new BattleP2PAdapter({
      localPeerId: 'p1',
      transportOverride: underlying
    });

    await adapter.connect('BATALHA-777');
    expect(adapter.getConnectionStatus()).toBe('connected');

    const battleMsg: BattleP2PMessage = {
      protocolVersion: '1.0.0',
      messageId: 'm1',
      type: 'BATTLE_INVITE',
      senderId: 'p1',
      sessionId: 's1',
      sequence: 1,
      payload: { hello: true },
      timestampMs: Date.now()
    };

    adapter.sendBattleMessage(battleMsg);

    expect(underlying.sentMessages.length).toBe(2);
    const helloSent = underlying.sentMessages[0];
    expect(helloSent.type).toBe('HANDSHAKE');
    expect((helloSent.payload as { battleEnvelope: BattleP2PMessage }).battleEnvelope.type).toBe('BATTLE_HELLO');

    const sent = underlying.sentMessages[1];
    expect(sent.type).toBe('HANDSHAKE');
    expect(sent.payload).toHaveProperty('battleEnvelope');
    expect((sent.payload as { battleEnvelope: BattleP2PMessage }).battleEnvelope.type).toBe('BATTLE_INVITE');

    adapter.disconnect();
    expect(adapter.getConnectionStatus()).toBe('idle');
  });

  it('unwraps incoming battle envelopes from underlying transport and delivers to handlers', () => {
    const underlying = new MockUnderlyingTransport();
    const adapter = new BattleP2PAdapter({
      localPeerId: 'p1',
      transportOverride: underlying
    });

    const received: BattleP2PMessage[] = [];
    adapter.onBattleMessage((msg) => {
      received.push(msg);
    });

    const battleMsg: BattleP2PMessage = {
      protocolVersion: '1.0.0',
      messageId: 'm2',
      type: 'BATTLE_INVITE_ACCEPT',
      senderId: 'remote-p2',
      sessionId: 's1',
      sequence: 2,
      payload: {},
      timestampMs: Date.now()
    };

    // Simulate incoming envelope
    underlying.messageHandler?.({
      type: 'HANDSHAKE',
      senderId: 'remote-p2',
      sessionId: 's1',
      payload: { battleEnvelope: battleMsg },
      timestampMs: Date.now()
    });

    // Simulate incoming messages without battleEnvelope to test guard branches
    underlying.messageHandler?.({
      type: 'HANDSHAKE',
      senderId: 'remote-p2',
      sessionId: 's1',
      payload: null,
      timestampMs: Date.now()
    });
    underlying.messageHandler?.({
      type: 'HANDSHAKE',
      senderId: 'remote-p2',
      sessionId: 's1',
      payload: 'string-payload',
      timestampMs: Date.now()
    });
    underlying.messageHandler?.({
      type: 'HANDSHAKE',
      senderId: 'remote-p2',
      sessionId: 's1',
      payload: { otherField: true },
      timestampMs: Date.now()
    });

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('BATTLE_INVITE_ACCEPT');
  });

  it('binds minimal transport without optional status and peers callbacks', () => {
    const minimal: P2PTransportPort = {
      localPeerId: 'p-min',
      connect: async () => {},
      disconnect: () => {},
      send: () => {},
      onMessage: () => () => {},
      onError: () => () => {}
    };
    const adapter = new BattleP2PAdapter({ localPeerId: 'p-min', transportOverride: minimal });
    expect(adapter.localPeerId).toBe('p-min');

    // Send before connect with no channel
    const standaloneAdapter = new BattleP2PAdapter();
    standaloneAdapter.sendBattleMessage({
      protocolVersion: '1.0.0',
      messageId: 'm-unconnected',
      type: 'BATTLE_CANCEL',
      senderId: 'p1',
      sessionId: 's1',
      sequence: 1,
      payload: {},
      timestampMs: Date.now()
    });
  });

  it('propagates errors and status updates from underlying transport', () => {
    const underlying = new MockUnderlyingTransport();
    const adapter = new BattleP2PAdapter({
      transportOverride: underlying
    });

    let receivedErr: Error | null = null;
    adapter.onError((err: Error) => {
      receivedErr = err;
    });

    underlying.errorHandler?.(new Error('Falha de sinal Bluetooth'));
    expect(receivedErr).toBeDefined();
    expect((receivedErr as unknown as Error)?.message).toBe('Falha de sinal Bluetooth');
    expect(adapter.getConnectionStatus()).toBe('failed');

    underlying.statusHandler?.('connected');
    expect(adapter.getConnectionStatus()).toBe('connected');

    const unbindErr = adapter.onError(() => {});
    unbindErr();
  });

  it('propagates discovered peers mapped to battle opponent DTO', () => {
    const underlying = new MockUnderlyingTransport();
    const adapter = new BattleP2PAdapter({
      transportOverride: underlying
    });

    let peersCount = 0;
    const unbindPeers = adapter.onPeersChange((peers) => {
      peersCount = peers.length;
    });

    underlying.peersHandler?.([
      {
        endpointId: 'ep-1',
        peerId: 'peer-opp',
        playerName: 'Adversário',
        avatarSpeciesId: 'ignisauro',
        protocolVersion: '1.0.0',
        discoveredAtMs: 12345
      }
    ]);

    expect(peersCount).toBe(1);
    expect(adapter.getDiscoveredPeers().length).toBe(1);
    expect(adapter.getDiscoveredPeers()[0].playerName).toBe('Adversário');

    unbindPeers();
  });

  it('delegates connectToPeer, acceptConnection, and rejectConnection to underlying transport', async () => {
    const underlying = new MockUnderlyingTransport();
    const adapter = new BattleP2PAdapter({
      transportOverride: underlying
    });

    await adapter.connectToPeer('ep-10');
    expect(underlying.connectedPeer).toBe('ep-10');

    await adapter.acceptConnection('ep-20');
    expect(underlying.acceptedPeer).toBe('ep-20');

    await adapter.rejectConnection('ep-30');
    expect(underlying.rejectedPeer).toBe('ep-30');
  });

  it('connects via standalone BroadcastChannel when no underlying transport provided', async () => {
    const adapter1 = new BattleP2PAdapter({ localPeerId: 'p1' });
    const adapter2 = new BattleP2PAdapter({ localPeerId: 'p2' });

    let statusUpdated = '';
    const unbindStatus = adapter1.onStatusChange((st) => {
      statusUpdated = st;
    });

    await adapter1.connect('ROOM-FALLBACK');
    await adapter2.connect('ROOM-FALLBACK');

    expect(statusUpdated).toBe('connected');

    const received: BattleP2PMessage[] = [];
    const unbindMsg = adapter2.onBattleMessage((msg) => {
      received.push(msg);
    });

    adapter1.sendBattleMessage({
      protocolVersion: '1.0.0',
      messageId: 'bc-1',
      type: 'BATTLE_HELLO',
      senderId: 'p1',
      sessionId: 'ROOM-FALLBACK',
      sequence: 1,
      payload: {},
      timestampMs: Date.now()
    });

    // Reconnect on already connected adapter to test channel closing
    await adapter1.connect('ROOM-FALLBACK-RECONNECT');

    // Deliver broadcast message directly to handler (including self, hello reply, and null data branches)
    let peersSeen: readonly import('../types').BattleDiscoveredOpponent[] = [];
    const unbindPeers2 = adapter2.onPeersChange((peers) => {
      peersSeen = peers;
    });

    const bc2 = (adapter2 as unknown as { channel?: { onmessage?: (e: unknown) => void } }).channel;
    if (bc2?.onmessage) {
      bc2.onmessage({ data: { senderId: 'p1', type: 'BATTLE_HELLO', payload: { playerName: 'Treinador P1', isReply: false } } });
      bc2.onmessage({ data: { senderId: 'p1', type: 'BATTLE_HELLO', payload: { playerName: 'Treinador P1 Atualizado', isReply: true } } });
      bc2.onmessage({ data: { senderId: 'p1', type: 'BATTLE_INVITE', payload: {} } });
      bc2.onmessage({ data: { senderId: 'p-other', type: 'BATTLE_HELLO', payload: {} } });
      bc2.onmessage({ data: { senderId: 'p3', type: 'BATTLE_HELLO' } });
      bc2.onmessage({ data: { senderId: adapter2.localPeerId, type: 'BATTLE_HELLO' } });
      bc2.onmessage({ data: null });
    }
    expect(adapter2.getDiscoveredPeers().length).toBe(3);
    expect(adapter2.getDiscoveredPeers()[0].playerName).toBe('Treinador P1 Atualizado');
    expect(adapter2.getDiscoveredPeers()[1].playerName).toBe('Treinador Próximo');
    expect(peersSeen.length).toBe(3);

    // Call connection delegation methods without underlying transport
    await adapter1.connectToPeer('ep-fallback');
    await adapter1.acceptConnection('ep-fallback');
    await adapter1.rejectConnection('ep-fallback');

    // Trigger onmessageerror fallback branch
    const bc = (adapter1 as unknown as { channel?: { onmessageerror?: () => void } }).channel;
    if (bc?.onmessageerror) {
      bc.onmessageerror();
      expect(adapter1.getConnectionStatus()).toBe('failed');
    }

    // Unsubscribe handlers
    unbindMsg();
    unbindStatus();
    adapter1.disconnect();
    adapter2.disconnect();
    expect(peersSeen.length).toBe(0);
    unbindPeers2();
  });

  it('delegates diagnostic logs and active endpoint id to underlying transport', () => {
    const underlying = new MockUnderlyingTransport();
    underlying.activeEndpointId = 'endpoint-123';
    underlying.diagnosticLogs = [{ timestampMs: 1234, level: 'info', message: 'test log' }];

    const adapter = new BattleP2PAdapter({
      localPeerId: 'p1',
      transportOverride: underlying
    });

    expect(adapter.getActiveEndpointId()).toBe('endpoint-123');
    expect(adapter.getDiagnosticLogs()).toEqual([{ timestampMs: 1234, level: 'info', message: 'test log' }]);

    let logsReceived: readonly BattleDiagnosticLogEntry[] = [];
    const unsub = adapter.onDiagnosticLog((logs) => {
      logsReceived = logs;
    });
    expect(logsReceived.length).toBe(1);
    unsub();
  });

  it('provides safe fallbacks for diagnostic logs when underlying transport lacks them', () => {
    const adapter = new BattleP2PAdapter({
      localPeerId: 'p1'
    });

    expect(adapter.getActiveEndpointId()).toBeNull();
    expect(adapter.getDiagnosticLogs()).toEqual([]);

    let logsReceived: readonly BattleDiagnosticLogEntry[] = [];
    const unsub = adapter.onDiagnosticLog((logs) => {
      logsReceived = logs;
    });
    expect(logsReceived).toEqual([]);
    unsub();
  });

  it('queues outgoing battle messages when underlying transport is in discovering/connecting state and flushes them on connected', async () => {
    const underlying = new MockUnderlyingTransport();
    let status: NearbyConnectionStatus = 'discovering';
    underlying.getConnectionStatus = () => status;

    const adapter = new BattleP2PAdapter({
      localPeerId: 'p1',
      transportOverride: underlying
    });

    await adapter.connect('BATALHA-777');
    // At connect time with status === 'discovering', BATTLE_HELLO was queued
    expect(underlying.sentMessages.length).toBe(0);

    const inviteMsg: BattleP2PMessage = {
      protocolVersion: '1.0.0',
      messageId: 'inv-1',
      type: 'BATTLE_INVITE',
      senderId: 'p1',
      sessionId: 's1',
      sequence: 1,
      payload: {},
      timestampMs: Date.now()
    };
    adapter.sendBattleMessage(inviteMsg);
    // Invite is also queued
    expect(underlying.sentMessages.length).toBe(0);

    // Transition underlying status to intermediate 'connecting' (covers non-connected branch)
    underlying.statusHandler?.('connecting');
    expect(underlying.sentMessages.length).toBe(0);

    // Transition underlying status to 'connected'
    status = 'connected';
    underlying.statusHandler?.('connected');

    // Both BATTLE_HELLO and BATTLE_INVITE should be flushed
    expect(underlying.sentMessages.length).toBe(2);
    expect((underlying.sentMessages[0].payload as { battleEnvelope: BattleP2PMessage }).battleEnvelope.type).toBe('BATTLE_HELLO');
    expect((underlying.sentMessages[1].payload as { battleEnvelope: BattleP2PMessage }).battleEnvelope.type).toBe('BATTLE_INVITE');

    // Further messages send immediately
    adapter.sendBattleMessage({
      protocolVersion: '1.0.0',
      messageId: 'acc-1',
      type: 'BATTLE_INVITE_ACCEPT',
      senderId: 'p1',
      sessionId: 's1',
      sequence: 2,
      payload: {},
      timestampMs: Date.now()
    });
    expect(underlying.sentMessages.length).toBe(3);

    // Disconnect clears any queue and resets
    adapter.disconnect();
    expect(adapter.getConnectionStatus()).toBe('idle');
  });
});
