import { describe, it, expect } from 'vitest';
import type { NearbyConnectionStatus } from '../types';
import {
  canTransitionConnectionStatus,
  transitionConnectionStatus
} from '../domain/connection-state-machine';

describe('NearbyConnectionStateMachine', () => {
  it('validates allowed status transitions along the discovery and pairing lifecycle', () => {
    expect(canTransitionConnectionStatus('idle', 'checking_environment')).toBe(true);
    expect(canTransitionConnectionStatus('checking_environment', 'requesting_permissions')).toBe(true);
    expect(canTransitionConnectionStatus('requesting_permissions', 'starting_discovery')).toBe(true);
    expect(canTransitionConnectionStatus('starting_discovery', 'discovering')).toBe(true);
    expect(canTransitionConnectionStatus('discovering', 'player_found')).toBe(true);
    expect(canTransitionConnectionStatus('player_found', 'connection_requested')).toBe(true);
    expect(canTransitionConnectionStatus('connection_requested', 'connecting')).toBe(true);
    expect(canTransitionConnectionStatus('connecting', 'authenticating')).toBe(true);
    expect(canTransitionConnectionStatus('authenticating', 'connected')).toBe(true);
    expect(canTransitionConnectionStatus('connected', 'disconnected')).toBe(true);
    expect(canTransitionConnectionStatus('disconnected', 'idle')).toBe(true);
  });

  it('allows remaining in the exact same state', () => {
    expect(canTransitionConnectionStatus('idle', 'idle')).toBe(true);
    expect(canTransitionConnectionStatus('discovering', 'discovering')).toBe(true);
    expect(canTransitionConnectionStatus('connected', 'connected')).toBe(true);
    expect(canTransitionConnectionStatus('invalid_state' as NearbyConnectionStatus, 'idle')).toBe(false);
  });

  it('supports fallback, failure and recovery paths', () => {
    expect(canTransitionConnectionStatus('discovering', 'failed')).toBe(true);
    expect(canTransitionConnectionStatus('failed', 'discovering')).toBe(true);
    expect(canTransitionConnectionStatus('failed', 'idle')).toBe(true);
    expect(canTransitionConnectionStatus('disconnected', 'discovering')).toBe(true);
    expect(canTransitionConnectionStatus('connecting', 'failed')).toBe(true);
    expect(canTransitionConnectionStatus('authenticating', 'failed')).toBe(true);
    expect(canTransitionConnectionStatus('connection_pending', 'connecting')).toBe(true);
  });

  it('transitions state successfully or throws if forbidden', () => {
    expect(transitionConnectionStatus('idle', 'discovering')).toBe('discovering');
    expect(() => transitionConnectionStatus('idle', 'connected')).toThrow(
      "Transição de estado Nearby inválida: de 'idle' para 'connected'."
    );
  });
});
