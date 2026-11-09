import type { NearbyConnectionStatus } from '../types';

const VALID_CONNECTION_TRANSITIONS: Record<NearbyConnectionStatus, readonly NearbyConnectionStatus[]> = {
  idle: ['checking_environment', 'requesting_permissions', 'starting_discovery', 'discovering', 'failed'],
  checking_environment: ['requesting_permissions', 'starting_discovery', 'discovering', 'failed', 'idle'],
  requesting_permissions: ['starting_discovery', 'discovering', 'failed', 'idle'],
  starting_discovery: ['discovering', 'failed', 'idle'],
  discovering: ['player_found', 'connection_requested', 'connection_pending', 'connecting', 'connected', 'idle', 'failed'],
  player_found: ['connection_requested', 'connection_pending', 'connecting', 'connected', 'discovering', 'idle', 'failed'],
  connection_requested: ['connecting', 'authenticating', 'connected', 'player_found', 'discovering', 'failed', 'idle'],
  connection_pending: ['connecting', 'authenticating', 'connected', 'player_found', 'discovering', 'failed', 'idle'],
  connecting: ['authenticating', 'connected', 'disconnected', 'failed', 'idle'],
  authenticating: ['connected', 'disconnected', 'failed', 'idle'],
  connected: ['disconnected', 'failed', 'idle'],
  disconnected: ['idle', 'starting_discovery', 'discovering', 'checking_environment'],
  failed: ['idle', 'starting_discovery', 'discovering', 'checking_environment', 'connection_requested', 'connecting']
};

export function canTransitionConnectionStatus(
  current: NearbyConnectionStatus,
  next: NearbyConnectionStatus
): boolean {
  if (current === next) return true;
  const allowed = VALID_CONNECTION_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function transitionConnectionStatus(
  current: NearbyConnectionStatus,
  next: NearbyConnectionStatus
): NearbyConnectionStatus {
  if (canTransitionConnectionStatus(current, next)) {
    return next;
  }
  throw new Error(`Transição de estado Nearby inválida: de '${current}' para '${next}'.`);
}
