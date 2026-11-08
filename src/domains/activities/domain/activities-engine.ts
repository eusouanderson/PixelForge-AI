import type { CharacterSpeciesDefinition } from '@/domains/characters/types';
import type { ActivityDefinition, ActivityExecutionResult } from '../types';

export const ACTIVITIES_CATALOG: Readonly<Record<string, ActivityDefinition>> = {
  'lava-sprint': {
    id: 'lava-sprint',
    name: 'Corrida nas Rochas Quentes',
    description: 'Treino explosivo de força e resistência próximo às fendas geotérmicas.',
    kind: 'train',
    preferredElement: 'fire',
    minEnergyRequired: 18,
    needsDelta: {
      hunger: -8,
      thirst: -10,
      energy: -16,
      happiness: 18,
      hygiene: -6,
      health: 4
    },
    attributeGains: { strength: 2, endurance: 1 },
    experienceReward: 30,
    coinReward: 25
  },
  'cryo-meditation': {
    id: 'cryo-meditation',
    name: 'Meditação Cristalina',
    description: 'Concentração serena que amplia a defesa e a afinidade elemental.',
    kind: 'meditate',
    preferredElement: 'ice',
    minEnergyRequired: 10,
    needsDelta: {
      hunger: -4,
      thirst: -4,
      energy: -8,
      happiness: 16,
      hygiene: 2,
      health: 6
    },
    attributeGains: { defense: 1, intelligence: 2 },
    experienceReward: 28,
    coinReward: 22
  },
  'thunder-dash': {
    id: 'thunder-dash',
    name: 'Circuito de Relâmpagos',
    description: 'Acrobacias de alta velocidade entre bobinas naturais para aprimorar reflexos.',
    kind: 'play',
    preferredElement: 'electric',
    minEnergyRequired: 16,
    needsDelta: {
      hunger: -7,
      thirst: -8,
      energy: -14,
      happiness: 22,
      hygiene: -4,
      health: 3
    },
    attributeGains: { agility: 2, elementalAffinity: 1 },
    experienceReward: 30,
    coinReward: 26
  },
  'spore-exploration': {
    id: 'spore-exploration',
    name: 'Exploração Bioluminescente',
    description: 'Investigação de trilhas místicas que estimula a inteligência e coleta âmbar.',
    kind: 'explore',
    preferredElement: 'poison',
    minEnergyRequired: 14,
    needsDelta: {
      hunger: -6,
      thirst: -6,
      energy: -12,
      happiness: 18,
      hygiene: -5,
      health: 4
    },
    attributeGains: { intelligence: 2, endurance: 1 },
    experienceReward: 28,
    coinReward: 32
  },
  'monolith-guard': {
    id: 'monolith-guard',
    name: 'Postura do Monólito',
    description: 'Treinamento tectônico de defesa inabalável junto às drusas de esmeralda.',
    kind: 'train',
    preferredElement: 'earth',
    minEnergyRequired: 15,
    needsDelta: {
      hunger: -7,
      thirst: -6,
      energy: -13,
      happiness: 16,
      hygiene: -4,
      health: 5
    },
    attributeGains: { defense: 2, strength: 1 },
    experienceReward: 30,
    coinReward: 25
  },
  'sky-glide': {
    id: 'sky-glide',
    name: 'Voo nas Correntes de Zéfiro',
    description: 'Planagem acrobática pelas correntes ascendentes do santuário celeste.',
    kind: 'play',
    preferredElement: 'air',
    minEnergyRequired: 15,
    needsDelta: {
      hunger: -6,
      thirst: -7,
      energy: -13,
      happiness: 24,
      hygiene: 2,
      health: 4
    },
    attributeGains: { agility: 2, intelligence: 1 },
    experienceReward: 30,
    coinReward: 26
  },
  'umbral-meditation': {
    id: 'umbral-meditation',
    name: 'Comunhão das Chamas Carmesim',
    description: 'Ritual silencioso sob o luar de obsidiana que eleva o poder elemental.',
    kind: 'meditate',
    preferredElement: 'shadow',
    minEnergyRequired: 12,
    needsDelta: {
      hunger: -5,
      thirst: -5,
      energy: -10,
      happiness: 18,
      hygiene: 0,
      health: 5
    },
    attributeGains: { elementalAffinity: 2, strength: 1 },
    experienceReward: 30,
    coinReward: 28
  },
  'solar-bask': {
    id: 'solar-bask',
    name: 'Banho de Luz da Aurora',
    description: 'Absorção de raios solares dourados que revigora a saúde e a afinidade luminosa.',
    kind: 'meditate',
    preferredElement: 'light',
    minEnergyRequired: 10,
    needsDelta: {
      hunger: -4,
      thirst: -5,
      energy: -6,
      happiness: 20,
      hygiene: 4,
      health: 8
    },
    attributeGains: { elementalAffinity: 2, defense: 1 },
    experienceReward: 30,
    coinReward: 28
  },
  'purifying-bath': {
    id: 'purifying-bath',
    name: 'Banho Termal Purificador',
    description: 'Remove impurezas, restaura a higiene ao máximo e previne doenças.',
    kind: 'bath',
    minEnergyRequired: 0,
    needsDelta: {
      hunger: 0,
      thirst: 8,
      energy: 4,
      happiness: 12,
      hygiene: 45,
      health: 8
    },
    attributeGains: {},
    experienceReward: 15,
    coinReward: 10
  },
  'deep-slumber': {
    id: 'deep-slumber',
    name: 'Repouso no Ninho Ancestral',
    description: 'Sono reparador que restaura profundamente a energia e a vitalidade.',
    kind: 'sleep',
    minEnergyRequired: 0,
    needsDelta: {
      hunger: -5,
      thirst: -5,
      energy: 48,
      happiness: 10,
      hygiene: 0,
      health: 12
    },
    attributeGains: { endurance: 1 },
    experienceReward: 15,
    coinReward: 10
  }
};

export function listAllActivities(): readonly ActivityDefinition[] {
  return Object.values(ACTIVITIES_CATALOG);
}

export function getActivityById(activityId: string): ActivityDefinition {
  return ACTIVITIES_CATALOG[activityId];
}

export function executeCharacterActivity(
  species: CharacterSpeciesDefinition,
  activityId: string,
  currentEnergy: number
): ActivityExecutionResult {
  const activity = getActivityById(activityId);

  if (currentEnergy < activity.minEnergyRequired) {
    return {
      success: false,
      activityId,
      message: `${species.displayName} está sem energia suficiente para ${activity.name}. Coloque-o para descansar primeiro!`,
      needsDelta: { hunger: 0, thirst: 0, energy: 0, happiness: 0, hygiene: 0, health: 0 },
      attributeGains: {},
      experienceGained: 0,
      coinsGained: 0
    };
  }

  const isFavorite = species.personality.favoriteActivityId === activityId;
  const isDisliked = species.personality.dislikedActivityId === activityId;

  const happinessMultiplier = isFavorite ? 1.4 : isDisliked ? 0.5 : 1.0;
  const xpMultiplier = isFavorite ? 1.3 : 1.0;

  return {
    success: true,
    activityId,
    message: isFavorite
      ? `${species.displayName} adorou praticar sua atividade favorita: ${activity.name}!`
      : isDisliked
        ? `${species.displayName} completou ${activity.name}, mas prefere atividades do seu elemento.`
        : `${species.displayName} concluiu ${activity.name} com sucesso!`,
    needsDelta: {
      ...activity.needsDelta,
      happiness: Math.round(activity.needsDelta.happiness * happinessMultiplier)
    },
    attributeGains: activity.attributeGains,
    experienceGained: Math.round(activity.experienceReward * xpMultiplier),
    coinsGained: activity.coinReward
  };
}

