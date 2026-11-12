import type { ElementAffinity } from '@/domains/characters/types';

export const ELEMENTAL_EFFECTIVENESS_MATRIX: Readonly<
  Record<ElementAffinity, Readonly<{
    strongAgainst: readonly ElementAffinity[];
    weakAgainst: readonly ElementAffinity[];
  }>>
> = {
  fire: {
    strongAgainst: ['ice', 'poison'],
    weakAgainst: ['earth', 'crystal']
  },
  ice: {
    strongAgainst: ['earth', 'air'],
    weakAgainst: ['fire', 'crystal']
  },
  electric: {
    strongAgainst: ['air', 'crystal'],
    weakAgainst: ['earth', 'cosmic']
  },
  poison: {
    strongAgainst: ['fairy', 'earth'],
    weakAgainst: ['fire', 'crystal']
  },
  earth: {
    strongAgainst: ['electric', 'fire'],
    weakAgainst: ['ice', 'poison']
  },
  air: {
    strongAgainst: ['fire', 'poison'],
    weakAgainst: ['electric', 'ice']
  },
  shadow: {
    strongAgainst: ['light', 'fairy'],
    weakAgainst: ['light', 'cosmic']
  },
  light: {
    strongAgainst: ['shadow', 'poison'],
    weakAgainst: ['shadow', 'crystal']
  },
  fairy: {
    strongAgainst: ['cosmic', 'shadow'],
    weakAgainst: ['poison', 'crystal']
  },
  crystal: {
    strongAgainst: ['fire', 'light'],
    weakAgainst: ['electric', 'earth']
  },
  cosmic: {
    strongAgainst: ['crystal', 'electric'],
    weakAgainst: ['fairy', 'light']
  }
};

export const ELEMENT_LABELS: Readonly<Record<ElementAffinity, string>> = {
  fire: 'Fogo',
  ice: 'Gelo',
  electric: 'Elétrico',
  poison: 'Veneno',
  earth: 'Terra',
  air: 'Ar',
  shadow: 'Sombra',
  light: 'Luz',
  fairy: 'Fada',
  crystal: 'Cristal',
  cosmic: 'Cósmico'
};

export const SUPER_EFFECTIVE_MULTIPLIER = 1.25;
export const NOT_VERY_EFFECTIVE_MULTIPLIER = 0.85;
export const NEUTRAL_MULTIPLIER = 1.0;

export function getElementalMultiplier(
  attackerElement: ElementAffinity,
  defenderElement: ElementAffinity
): number {
  const profile = ELEMENTAL_EFFECTIVENESS_MATRIX[attackerElement];
  if (!profile) return NEUTRAL_MULTIPLIER;

  if (profile.strongAgainst.includes(defenderElement)) {
    return SUPER_EFFECTIVE_MULTIPLIER;
  }
  if (profile.weakAgainst.includes(defenderElement)) {
    return NOT_VERY_EFFECTIVE_MULTIPLIER;
  }
  return NEUTRAL_MULTIPLIER;
}

export function getElementalEffectivenessDescription(
  attackerElement: ElementAffinity,
  defenderElement: ElementAffinity
): string {
  const mult = getElementalMultiplier(attackerElement, defenderElement);
  if (mult > NEUTRAL_MULTIPLIER) {
    return `Super efetivo! (${ELEMENT_LABELS[attackerElement]} tem vantagem sobre ${ELEMENT_LABELS[defenderElement]})`;
  }
  if (mult < NEUTRAL_MULTIPLIER) {
    return `Pouco efetivo... (${ELEMENT_LABELS[defenderElement]} resiste a ${ELEMENT_LABELS[attackerElement]})`;
  }
  return `Efetividade neutra entre ${ELEMENT_LABELS[attackerElement]} e ${ELEMENT_LABELS[defenderElement]}.`;
}
