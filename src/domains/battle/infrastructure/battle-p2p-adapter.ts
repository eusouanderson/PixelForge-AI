import type {
  DiscoveredPeer,
  P2PMessage,
  P2PTransportPort
} from '@/domains/breeding/types';
import type {
  BattleDiscoveredOpponent,
  BattleP2PMessage,
  BattleTransportPort
} from '../types';

export const BATTLE_PROTOCOL_VERSION = '1.0.0';

export interface BattleP2PAdapterOptions {
  readonly localPeerId?: string;
  readonly playerName?: string;
  readonly transportOverride?: P2PTransportPort;
}

export class BattleP2PAdapter implements BattleTransportPort {
  public readonly localPeerId: string;
  public readonly playerName: string;

  private readonly underlyingTransport?: P2PTransportPort;
  private channel: BroadcastChannel | null = null;
  private activeChannelId = '';
  private messageHandlers: Array<(msg: BattleP2PMessage) => void> = [];
  private errorHandlers: Array<(err: Error) => void> = [];
  private statusHandlers: Array<(status: string) => void> = [];
  private peersHandlers: Array<(peers: readonly BattleDiscoveredOpponent[]) => void> = [];
  private status = 'idle';
  private discoveredOpponents: BattleDiscoveredOpponent[] = [];

  constructor(options: BattleP2PAdapterOptions = {}) {
    this.localPeerId = options.localPeerId ?? `peer-${Math.random().toString(36).slice(2, 9)}`;
    this.playerName = options.playerName ?? 'Treinador Arena';
    this.underlyingTransport = options.transportOverride;

    if (this.underlyingTransport) {
      this.bindUnderlyingTransport(this.underlyingTransport);
    }
  }

  public getConnectionStatus(): string {
    return this.status;
  }

  public getDiscoveredPeers(): readonly BattleDiscoveredOpponent[] {
    return [...this.discoveredOpponents];
  }

  public async connect(channelId: string): Promise<void> {
    this.activeChannelId = channelId;
    this.setStatus('discovering');

    if (this.underlyingTransport) {
      await this.underlyingTransport.connect(channelId);
      this.setStatus(this.underlyingTransport.getConnectionStatus?.() ?? 'connected');
      return;
    }

    // Web BroadcastChannel fallback isolado para batalha
    if (typeof globalThis.BroadcastChannel === 'function') {
      if (this.channel) {
        this.channel.close();
      }
      this.channel = new globalThis.BroadcastChannel(`battle-${channelId}`);
      this.channel.onmessage = (event: MessageEvent) => {
        const data = event.data as BattleP2PMessage;
        if (data && data.senderId !== this.localPeerId) {
          if (data.type === 'BATTLE_HELLO') {
            const payload = data.payload as { playerName?: string; isReply?: boolean } | undefined;
            const existingIdx = this.discoveredOpponents.findIndex((o) => o.peerId === data.senderId);
            const opponentInfo: BattleDiscoveredOpponent = {
              endpointId: data.senderId,
              peerId: data.senderId,
              playerName: payload?.playerName ?? 'Treinador Próximo',
              avatarSpeciesId: 'ignisauro',
              discoveredAtMs: Date.now()
            };
            if (existingIdx === -1) {
              this.discoveredOpponents.push(opponentInfo);
            } else {
              this.discoveredOpponents[existingIdx] = opponentInfo;
            }
            for (const h of this.peersHandlers) {
              h([...this.discoveredOpponents]);
            }
            if (!payload?.isReply) {
              this.sendBattleMessage({
                protocolVersion: BATTLE_PROTOCOL_VERSION,
                messageId: `hello-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'BATTLE_HELLO',
                senderId: this.localPeerId,
                sessionId: this.activeChannelId,
                sequence: 0,
                payload: { playerName: this.playerName, isReply: true },
                timestampMs: Date.now()
              });
            }
          }

          for (const handler of this.messageHandlers) {
            handler(data);
          }
        }
      };
      this.channel.onmessageerror = () => {
        this.emitError(new Error('Falha na desserialização de mensagem P2P de batalha.'));
      };
      this.setStatus('connected');

      // Anuncia presença na sala Web BroadcastChannel
      this.sendBattleMessage({
        protocolVersion: BATTLE_PROTOCOL_VERSION,
        messageId: `hello-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'BATTLE_HELLO',
        senderId: this.localPeerId,
        sessionId: this.activeChannelId,
        sequence: 0,
        payload: { playerName: this.playerName, isReply: false },
        timestampMs: Date.now()
      });
    /* v8 ignore start */
    } else {
      this.setStatus('connected');
    }
    /* v8 ignore stop */
  }

  public disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.underlyingTransport) {
      this.underlyingTransport.disconnect();
    }
    this.discoveredOpponents = [];
    for (const h of this.peersHandlers) {
      h([]);
    }
    this.setStatus('idle');
  }

  public sendBattleMessage(message: BattleP2PMessage): void {
    if (this.underlyingTransport) {
      // Envelopa mensagem com envelope seguro
      const envelope: P2PMessage<{ readonly battleEnvelope: BattleP2PMessage }> = {
        type: 'HANDSHAKE',
        senderId: this.localPeerId,
        sessionId: this.activeChannelId,
        payload: { battleEnvelope: message },
        timestampMs: Date.now()
      };
      this.underlyingTransport.send(envelope);
      return;
    }

    if (this.channel) {
      const serialized = JSON.parse(JSON.stringify(message)) as BattleP2PMessage;
      this.channel.postMessage(serialized);
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

  public onStatusChange(handler: (status: string) => void): () => void {
    this.statusHandlers.push(handler);
    handler(this.status);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  public onPeersChange(handler: (peers: readonly BattleDiscoveredOpponent[]) => void): () => void {
    this.peersHandlers.push(handler);
    handler(this.discoveredOpponents);
    return () => {
      this.peersHandlers = this.peersHandlers.filter((h) => h !== handler);
    };
  }

  public async connectToPeer(endpointId: string): Promise<void> {
    if (this.underlyingTransport?.connectToPeer) {
      await this.underlyingTransport.connectToPeer(endpointId);
    }
  }

  public async acceptConnection(endpointId: string): Promise<void> {
    if (this.underlyingTransport?.acceptConnection) {
      await this.underlyingTransport.acceptConnection(endpointId);
    }
  }

  public async rejectConnection(endpointId: string): Promise<void> {
    if (this.underlyingTransport?.rejectConnection) {
      await this.underlyingTransport.rejectConnection(endpointId);
    }
  }

  private setStatus(nextStatus: string): void {
    this.status = nextStatus;
    for (const h of this.statusHandlers) {
      h(this.status);
    }
  }

  private emitError(err: Error): void {
    this.setStatus('failed');
    for (const h of this.errorHandlers) {
      h(err);
    }
  }

  private bindUnderlyingTransport(transport: P2PTransportPort): void {
    transport.onMessage((rawMsg) => {
      const payload = rawMsg.payload;
      if (
        payload &&
        typeof payload === 'object' &&
        'battleEnvelope' in payload
      ) {
        const battleMsg = (payload as { battleEnvelope: BattleP2PMessage }).battleEnvelope;
        for (const handler of this.messageHandlers) {
          handler(battleMsg);
        }
      }
    });

    transport.onError((err) => {
      this.emitError(err);
    });

    if (transport.onStatusChange) {
      transport.onStatusChange((st) => {
        this.setStatus(st);
      });
    }

    if (transport.onPeersChange) {
      transport.onPeersChange((peers: readonly DiscoveredPeer[]) => {
        this.discoveredOpponents = peers.map((p) => ({
          endpointId: p.endpointId,
          peerId: p.peerId,
          playerName: p.playerName,
          avatarSpeciesId: p.avatarSpeciesId,
          discoveredAtMs: p.discoveredAtMs
        }));
        for (const h of this.peersHandlers) {
          h(this.discoveredOpponents);
        }
      });
    }
  }
}
