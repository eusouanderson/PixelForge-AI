export interface InventorySlot {
  readonly itemId: string;
  readonly quantity: number;
}

export interface InventoryState {
  readonly slots: Readonly<Record<string, number>>;
  readonly maxCapacityPerItem: number;
}

export interface InventoryMutationResult {
  readonly success: boolean;
  readonly state: InventoryState;
  readonly reason?: string;
}

