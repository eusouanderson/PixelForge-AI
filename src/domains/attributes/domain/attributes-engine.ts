import type { AttributeModifier, CharacterAttributes } from '../types';

export function clampAttributeValue(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(1, Math.min(999, Math.round(value)));
}

export function applyAttributeModifier(
  current: CharacterAttributes,
  modifier: AttributeModifier
): CharacterAttributes {
  const d = modifier.deltas;
  return {
    strength: clampAttributeValue(current.strength + (d.strength ?? 0)),
    defense: clampAttributeValue(current.defense + (d.defense ?? 0)),
    agility: clampAttributeValue(current.agility + (d.agility ?? 0)),
    intelligence: clampAttributeValue(current.intelligence + (d.intelligence ?? 0)),
    endurance: clampAttributeValue(current.endurance + (d.endurance ?? 0)),
    elementalAffinity: clampAttributeValue(current.elementalAffinity + (d.elementalAffinity ?? 0))
  };
}

export function computeTotalPowerRating(attrs: CharacterAttributes): number {
  return (
    attrs.strength +
    attrs.defense +
    attrs.agility +
    attrs.intelligence +
    attrs.endurance +
    attrs.elementalAffinity
  );
}

