import { describe, it, expect } from 'vitest';
import {
  BroadcastChannelP2PAdapter,
  DirectLinkedMockP2PAdapter
} from '../infrastructure/p2p-channel-adapter';
import type { P2PMessage } from '../types';

describe('Breeding: P2P Channel Adapter', () => {
  it('communicates via DirectLinkedMockP2PAdapter between two nodes', () => {
    const nodeA = new DirectLinkedMockP2PAdapter('peer-A');
    const nodeB = new DirectLinkedMockP2PAdapter('peer-B');
    nodeA.link(nodeB);

    const receivedByB: P2PMessage[] = [];
    const unsubscribe = nodeB.onMessage((msg) => {
      receivedByB.push(msg);
    });

    const testMsg: P2PMessage = {
      type: 'HANDSHAKE',
      senderId: 'peer-A',
      sessionId: 'test-session',
      payload: { hello: 'world' },
      timestampMs: 1234
    };

    nodeA.send(testMsg);
    expect(receivedByB).toHaveLength(1);
    expect(receivedByB[0].payload).toEqual({ hello: 'world' });

    unsubscribe();
    nodeA.send(testMsg);
    expect(receivedByB).toHaveLength(1); // No new message received after unsubscribe

    // Disconnect
    nodeA.disconnect();
    expect(nodeA.peerEndpoint).toBeNull();
  });

  it('handles error when sending message without connected peer in mock adapter', () => {
    const isolated = new DirectLinkedMockP2PAdapter('peer-isolated');
    const errors: Error[] = [];
    isolated.onError((err) => errors.push(err));

    isolated.send({
      type: 'CANCEL',
      senderId: 'peer-isolated',
      sessionId: 'sess-1',
      payload: {},
      timestampMs: 1000
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Nenhum par conectado no canal simulado.');
  });

  it('broadcast channel adapter connects, sends and unbinds cleanly with mock channel', async () => {
    let triggerMessage: ((ev: MessageEvent) => void) | undefined;
    let triggerError: (() => void) | undefined;
    const posted: unknown[] = [];

    class MockBroadcastChannel {
      public name: string;
      constructor(name: string) {
        this.name = name;
      }
      set onmessage(cb: (ev: MessageEvent) => void) {
        triggerMessage = cb;
      }
      set onmessageerror(cb: () => void) {
        triggerError = cb;
      }
      postMessage(msg: unknown) {
        posted.push(msg);
      }
      close() {}
    }

    const originalBC = globalThis.BroadcastChannel;
    (globalThis as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel = MockBroadcastChannel;

    const adapter = new BroadcastChannelP2PAdapter('custom-local-peer');
    await adapter.connect('test-channel-room');

    const received: P2PMessage[] = [];
    const errors: Error[] = [];
    const unsubMsg = adapter.onMessage((m) => received.push(m));
    const unsubErr = adapter.onError((e) => errors.push(e));

    // Send a message
    adapter.send({
      type: 'HANDSHAKE',
      senderId: 'custom-local-peer',
      sessionId: 'sess-1',
      payload: {},
      timestampMs: 1000
    });
    expect(posted).toHaveLength(1);

    // Incoming message from another sender
    if (typeof triggerMessage === 'function') {
      const fn = triggerMessage;
      fn({
        data: {
          type: 'HANDSHAKE',
          senderId: 'other-peer',
          sessionId: 'sess-1',
          payload: { ping: true },
          timestampMs: 1000
        }
      } as MessageEvent);
      expect(received).toHaveLength(1);

      // Incoming message from self (ignored)
      fn({
        data: {
          type: 'HANDSHAKE',
          senderId: 'custom-local-peer',
          sessionId: 'sess-1',
          payload: {},
          timestampMs: 1000
        }
      } as MessageEvent);
      expect(received).toHaveLength(1);
    }

    // Trigger onmessageerror
    if (typeof triggerError === 'function') {
      const errFn = triggerError;
      errFn();
      expect(errors).toHaveLength(1);
    }

    unsubMsg();
    unsubErr();
    adapter.disconnect();

    // Sending after disconnect (channel is null) does nothing safely
    adapter.send({
      type: 'HANDSHAKE',
      senderId: 'custom-local-peer',
      sessionId: 'sess-1',
      payload: {},
      timestampMs: 1000
    });

    // Test when globalThis.BroadcastChannel is undefined
    (globalThis as unknown as { BroadcastChannel: undefined }).BroadcastChannel = undefined;
    const noBCAdapter = new BroadcastChannelP2PAdapter();
    await noBCAdapter.connect('test-room');
    noBCAdapter.disconnect();

    // Restore
    globalThis.BroadcastChannel = originalBC;
  });
});
