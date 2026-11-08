export type NeedKind =
  | 'hunger'
  | 'thirst'
  | 'energy'
  | 'happiness'
  | 'hygiene'
  | 'health';

export interface PetNeedsState {
  readonly hunger: number;
  readonly thirst: number;
  readonly energy: number;
  readonly happiness: number;
  readonly hygiene: number;
  readonly health: number;
}

export interface NeedDecayRatesPerHour {
  readonly hunger: number;
  readonly thirst: number;
  readonly energy: number;
  readonly happiness: number;
  readonly hygiene: number;
}

export interface NeedCriticalStatus {
  readonly isStarving: boolean;
  readonly isDehydrated: boolean;
  readonly isExhausted: boolean;
  readonly isDepressed: boolean;
  readonly isFilthy: boolean;
  readonly isSick: boolean;
  readonly isDeceased: boolean;
}

export interface NeedsDelta {
  readonly hunger?: number;
  readonly thirst?: number;
  readonly energy?: number;
  readonly happiness?: number;
  readonly hygiene?: number;
  readonly health?: number;
}

export interface NeedsSimulationResult {
  readonly previousNeeds: PetNeedsState;
  readonly currentNeeds: PetNeedsState;
  readonly elapsedMinutes: number;
  readonly criticalStatus: NeedCriticalStatus;
}

