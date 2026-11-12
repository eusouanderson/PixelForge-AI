import { describe, it, expect } from 'vitest';
import type { DiscoveredPeer, NearbyConnectionStatus, P2PMessage, P2PTransportPort } from '@/domains/breeding/types';
import { BattleP2PAdapter } from '../infrastructure/battle-p2p-adapter';
import type { BattleP2PMessage } from '../types';

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

    expect(underlying.sentMessages.length).toBe(1);
    const sent = underlying.sentMessages[0];
    expect(sent.type).toBe('HANDSHAKE');
    expect(sent.payload).toHaveProperty('battleEnvelope');
    expect((sent.payload as { battleEnvelope: BattleP2PMessage }).battleEnvelope.type).toBe('BATTLE_INVITE');
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

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('BATTLE_INVITE_ACCEPT');
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
  });

  it('propagates discovered peers mapped to battle opponent DTO', () => {
    const underlying = new MockUnderlyingTransport();
    const adapter = new BattleP2PAdapter({
      transportOverride: underlying
    });

    let peersCount = 0;
    adapter.onPeersChange((peers) => {
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
    adapter2.onBattleMessage((msg) => {
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

    // Unsubscribe handlers
    unbindStatus();
    adapter1.disconnect();
    adapter2.disconnect();
  });
});
