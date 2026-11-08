import { describe, it, expect } from 'vitest';
import {
  createStarterInventory,
  getItemQuantity,
  addItemToInventory,
  consumeItemFromInventory
} from '../domain/inventory-engine';

describe('inventory domain engine', () => {
  it('creates starter inventory with all signature foods and care supplies', () => {
    const inv = createStarterInventory();
    expect(getItemQuantity(inv, 'volcanic-roast-meat')).toBeGreaterThanOrEqual(3);
    expect(getItemQuantity(inv, 'thermal-spring-water')).toBeGreaterThanOrEqual(5);
    expect(getItemQuantity(inv, 'non-existent')).toBe(0);
  });

  it('adds items respecting maxCapacityPerItem and rejects non-positive amounts', () => {
    const inv = createStarterInventory();

    const invalidAdd = addItemToInventory(inv, 'volcanic-roast-meat', 0);
    expect(invalidAdd.success).toBe(false);

    const validAdd = addItemToInventory(inv, 'volcanic-roast-meat', 5);
    expect(validAdd.success).toBe(true);
    expect(getItemQuantity(validAdd.state, 'volcanic-roast-meat')).toBe(
      getItemQuantity(inv, 'volcanic-roast-meat') + 5
    );

    const cappedAdd = addItemToInventory(inv, 'new-berry', 500);
    expect(cappedAdd.success).toBe(true);
    expect(getItemQuantity(cappedAdd.state, 'new-berry')).toBe(inv.maxCapacityPerItem);
  });

  it('consumes items when available and rejects when out of stock or invalid quantity', () => {
    const inv = createStarterInventory();

    const invalidConsume = consumeItemFromInventory(inv, 'volcanic-roast-meat', -1);
    expect(invalidConsume.success).toBe(false);

    const missingConsume = consumeItemFromInventory(inv, 'missing-food', 1);
    expect(missingConsume.success).toBe(false);
    expect(missingConsume.reason).toContain('Estoque insuficiente');

    const startQty = getItemQuantity(inv, 'volcanic-roast-meat');
    const validConsume = consumeItemFromInventory(inv, 'volcanic-roast-meat', 1);
    expect(validConsume.success).toBe(true);
    expect(getItemQuantity(validConsume.state, 'volcanic-roast-meat')).toBe(startQty - 1);
  });
});

