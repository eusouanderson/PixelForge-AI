import type { InventoryMutationResult, InventoryState } from '../types';

export function createStarterInventory(): InventoryState {
  return {
    maxCapacityPerItem: 99,
    slots: {
      'volcanic-roast-meat': 3,
      'frosted-crystal-berry': 3,
      'plasma-thunder-fruit': 3,
      'glowing-swamp-mushroom': 3,
      'emerald-crystal-geode': 3,
      'sky-winged-cloudberry': 3,
      'crimson-shadow-soulfruit': 3,
      'golden-starburst-sunpeach': 3,
      'thermal-spring-water': 6,
      'nutri-vital-serum': 2,
      'isotonic-hydra-elixir': 2,
      'enzymatic-digest-tonic': 2,
      'antitoxin-charcoal-extract': 2,
      'antiseptic-spore-salve': 2,
      'adrenal-stamina-ampoule': 2,
      'serotonin-aura-nectar': 2,
      'vitality-herbal-elixir': 4
    }
  };
}

export function getItemQuantity(state: InventoryState, itemId: string): number {
  return state.slots[itemId] ?? 0;
}

export function addItemToInventory(
  state: InventoryState,
  itemId: string,
  amount: number
): InventoryMutationResult {
  const safeAmount = Math.floor(amount);
  if (safeAmount <= 0) {
    return {
      success: false,
      state,
      reason: 'Quantidade para adicionar deve ser positiva.'
    };
  }

  const current = getItemQuantity(state, itemId);
  const nextQuantity = Math.min(state.maxCapacityPerItem, current + safeAmount);

  return {
    success: true,
    state: {
      ...state,
      slots: {
        ...state.slots,
        [itemId]: nextQuantity
      }
    }
  };
}

export function consumeItemFromInventory(
  state: InventoryState,
  itemId: string,
  amount: number = 1
): InventoryMutationResult {
  const safeAmount = Math.floor(amount);
  if (safeAmount <= 0) {
    return {
      success: false,
      state,
      reason: 'Quantidade para consumo deve ser positiva.'
    };
  }

  const current = getItemQuantity(state, itemId);
  if (current < safeAmount) {
    return {
      success: false,
      state,
      reason: `Estoque insuficiente de ${itemId}.`
    };
  }

  return {
    success: true,
    state: {
      ...state,
      slots: {
        ...state.slots,
        [itemId]: current - safeAmount
      }
    }
  };
}

