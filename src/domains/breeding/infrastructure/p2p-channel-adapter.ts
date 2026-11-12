import type { P2PMessage, P2PTransportPort } from '../types';

export class BroadcastChannelP2PAdapter implements P2PTransportPort {
  public readonly localPeerId: string;
  private channel: BroadcastChannel | null = null;
  private messageHandlers: Array<(msg: P2PMessage) => void> = [];
  private errorHandlers: Array<(err: Error) => void> = [];

  constructor(localPeerId?: string) {
    this.localPeerId = localPeerId ?? `peer-${Math.random().toString(36).slice(2, 9)}`;
  }

  public async connect(channelId: string): Promise<void> {
    this.disconnect();

    if (typeof globalThis.BroadcastChannel === 'function') {
      this.channel = new globalThis.BroadcastChannel(channelId);
      this.channel.onmessage = (event: MessageEvent) => {
        const data = event.data as P2PMessage;
        if (data && data.senderId !== this.localPeerId) {
          for (const handler of this.messageHandlers) {
            handler(data);
          }
        }
      };
      this.channel.onmessageerror = () => {
        const err = new Error('Falha na desserialização de mensagem P2P.');
        for (const handler of this.errorHandlers) {
          handler(err);
        }
      };
    }
  }

  public disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  public send(message: P2PMessage): void {
    if (this.channel) {
      // Strip nested Vue reactive Proxies so browser BroadcastChannel structured clone never throws DataCloneError.
      const serializableMessage = JSON.parse(JSON.stringify(message)) as P2PMessage;
      this.channel.postMessage(serializableMessage);
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
}

export class DirectLinkedMockP2PAdapter implements P2PTransportPort {
  public readonly localPeerId: string;
  public peerEndpoint: DirectLinkedMockP2PAdapter | null = null;
  private messageHandlers: Array<(msg: P2PMessage) => void> = [];
  private errorHandlers: Array<(err: Error) => void> = [];

  constructor(localPeerId: string) {
    this.localPeerId = localPeerId;
  }

  public link(other: DirectLinkedMockP2PAdapter): void {
    this.peerEndpoint = other;
    other.peerEndpoint = this;
  }

  public async connect(_channelId: string): Promise<void> {
    // Already in memory
  }

  public disconnect(): void {
    if (this.peerEndpoint) {
      this.peerEndpoint.peerEndpoint = null;
      this.peerEndpoint = null;
    }
  }

  public send(message: P2PMessage): void {
    if (!this.peerEndpoint) {
      const err = new Error('Nenhum par conectado no canal simulado.');
      for (const handler of this.errorHandlers) {
        handler(err);
      }
      return;
    }

    for (const handler of this.peerEndpoint.messageHandlers) {
      handler(message);
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
}
