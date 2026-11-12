import type { ActiveDisease, CharacterSpeciesDefinition } from '@/domains/characters/types';
import type {
  DietaryPreference,
  FeedingReaction,
  FoodItemDefinition
} from '../types';
import { FOOD_PIXEL_ARTS } from './food-pixel-art-catalog';

const RAW_FOOD_CATALOG: Readonly<Record<string, Omit<FoodItemDefinition, 'pixelArt'>>> = {
  'volcanic-roast-meat': {
    id: 'volcanic-roast-meat',
    name: 'Pernil Vulcânico Assado',
    description: 'Carne pré-histórica assada no calor geotérmico com osso crocante. Favorito do Ignisauro.',
    category: 'meat',
    rarity: 'uncommon',
    elementAffinity: 'fire',
    priceCoins: 25,
    nutrition: {
      hungerRestore: 28,
      thirstRestore: -4,
      energyDelta: 10,
      happinessDelta: 14,
      healthDelta: 6,
      hygieneDelta: -3
    },
    attributeBonus: {
      strength: 1,
      elementalAffinity: 1
    },
    pixelColors: {
      primary: '#ea580c',
      secondary: '#7c2d12',
      highlight: '#fef9c3'
    }
  },
  'frosted-crystal-berry': {
    id: 'frosted-crystal-berry',
    name: 'Fruta-Cristal da Tundra',
    description: 'Fruto congelado rico em minerais criogênicos refrescantes. Favorito do Glacissauro.',
    category: 'fruit',
    rarity: 'uncommon',
    elementAffinity: 'ice',
    priceCoins: 25,
    nutrition: {
      hungerRestore: 22,
      thirstRestore: 10,
      energyDelta: 8,
      happinessDelta: 14,
      healthDelta: 6,
      hygieneDelta: 0
    },
    attributeBonus: {
      defense: 1,
      endurance: 1
    },
    pixelColors: {
      primary: '#38bdf8',
      secondary: '#1e3a8a',
      highlight: '#e0f2fe'
    }
  },
  'plasma-thunder-fruit': {
    id: 'plasma-thunder-fruit',
    name: 'Fruta-Trovão de Plasma',
    description: 'Fruto energético losangular que pulsa com carga bioelétrica. Favorito do Electrossauro.',
    category: 'fruit',
    rarity: 'rare',
    elementAffinity: 'electric',
    priceCoins: 30,
    nutrition: {
      hungerRestore: 24,
      thirstRestore: 6,
      energyDelta: 20,
      happinessDelta: 15,
      healthDelta: 4,
      hygieneDelta: 0
    },
    attributeBonus: {
      agility: 2
    },
    pixelColors: {
      primary: '#fde047',
      secondary: '#1e293b',
      highlight: '#22d3ee'
    }
  },
  'glowing-swamp-mushroom': {
    id: 'glowing-swamp-mushroom',
    name: 'Cogumelo Bioluminescente',
    description: 'Fungo mutante violeta com pintas verde-limão nutritivas. Favorito do Toxissauro.',
    category: 'fungi',
    rarity: 'uncommon',
    elementAffinity: 'poison',
    priceCoins: 25,
    nutrition: {
      hungerRestore: 25,
      thirstRestore: -2,
      energyDelta: 9,
      happinessDelta: 14,
      healthDelta: 10,
      hygieneDelta: -2
    },
    attributeBonus: {
      intelligence: 1,
      endurance: 1
    },
    pixelColors: {
      primary: '#a855f7',
      secondary: '#4c1d95',
      highlight: '#a3e635'
    }
  },
  'emerald-crystal-geode': {
    id: 'emerald-crystal-geode',
    name: 'Geodo Crocante de Esmeralda',
    description: 'Aglomerado mineral rico em sílica e cristais de esmeralda. Favorito do Terrassauro.',
    category: 'crystal',
    rarity: 'rare',
    elementAffinity: 'earth',
    priceCoins: 30,
    nutrition: {
      hungerRestore: 30,
      thirstRestore: -4,
      energyDelta: 8,
      happinessDelta: 14,
      healthDelta: 8,
      hygieneDelta: 0
    },
    attributeBonus: {
      defense: 2
    },
    pixelColors: {
      primary: '#34d399',
      secondary: '#78716c',
      highlight: '#ffffff'
    }
  },
  'sky-winged-cloudberry': {
    id: 'sky-winged-cloudberry',
    name: 'Fruta-Nuvem Alada de Zéfiro',
    description: 'Fruto celeste levitante envolvido por brisas puras. Favorito do Aerossauro.',
    category: 'fruit',
    rarity: 'rare',
    elementAffinity: 'air',
    priceCoins: 28,
    nutrition: {
      hungerRestore: 23,
      thirstRestore: 10,
      energyDelta: 14,
      happinessDelta: 16,
      healthDelta: 5,
      hygieneDelta: 2
    },
    attributeBonus: {
      agility: 1,
      intelligence: 1
    },
    pixelColors: {
      primary: '#38bdf8',
      secondary: '#e0f2fe',
      highlight: '#ffffff'
    }
  },
  'crimson-shadow-soulfruit': {
    id: 'crimson-shadow-soulfruit',
    name: 'Fruto Abissal de Rubi',
    description: 'Fruto místico noturno de casca escura e polpa carmesim. Favorito do Umbrassauro.',
    category: 'nectar',
    rarity: 'epic',
    elementAffinity: 'shadow',
    priceCoins: 35,
    nutrition: {
      hungerRestore: 26,
      thirstRestore: 6,
      energyDelta: 14,
      happinessDelta: 16,
      healthDelta: 7,
      hygieneDelta: 0
    },
    attributeBonus: {
      strength: 1,
      elementalAffinity: 1
    },
    pixelColors: {
      primary: '#f43f5e',
      secondary: '#be123c',
      highlight: '#fda4af'
    }
  },
  'golden-starburst-sunpeach': {
    id: 'golden-starburst-sunpeach',
    name: 'Pêssego Solar Dourado',
    description: 'Fruto sagrado banhado pela luz da aurora que irradia calor vital. Favorito do Solassauro.',
    category: 'nectar',
    rarity: 'epic',
    elementAffinity: 'light',
    priceCoins: 35,
    nutrition: {
      hungerRestore: 27,
      thirstRestore: 8,
      energyDelta: 15,
      happinessDelta: 18,
      healthDelta: 9,
      hygieneDelta: 2
    },
    attributeBonus: {
      intelligence: 1,
      elementalAffinity: 1
    },
    pixelColors: {
      primary: '#ea580c',
      secondary: '#fef9c3',
      highlight: '#ffffff'
    }
  },
  'thermal-spring-water': {
    id: 'thermal-spring-water',
    name: 'Água Cristalina da Nascente',
    description: 'Água pura mineralizada que hidrata profundamente qualquer criatura elemental.',
    category: 'hydration',
    rarity: 'common',
    priceCoins: 12,
    nutrition: {
      hungerRestore: 0,
      thirstRestore: 35,
      energyDelta: 6,
      happinessDelta: 6,
      healthDelta: 4,
      hygieneDelta: 4
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#38bdf8',
      secondary: '#0284c7',
      highlight: '#e0f2fe'
    }
  },
  'nutri-vital-serum': {
    id: 'nutri-vital-serum',
    name: 'Soro Nutri-Vital Concentrado',
    description: 'Remédio específico para curar Desnutrição Aguda causada por fome extrema.',
    category: 'medicine',
    rarity: 'uncommon',
    curesDiseaseId: 'malnutrition',
    priceCoins: 45,
    nutrition: {
      hungerRestore: 35,
      thirstRestore: 10,
      energyDelta: 15,
      happinessDelta: 8,
      healthDelta: 25,
      hygieneDelta: 0
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#f97316',
      secondary: '#c2410c',
      highlight: '#ffedd5'
    }
  },
  'isotonic-hydra-elixir': {
    id: 'isotonic-hydra-elixir',
    name: 'Elixir Isotônico de Hidratação',
    description: 'Remédio específico para curar Desidratação Severa causada por falta crítica de água.',
    category: 'medicine',
    rarity: 'uncommon',
    curesDiseaseId: 'severe_dehydration',
    priceCoins: 45,
    nutrition: {
      hungerRestore: 0,
      thirstRestore: 45,
      energyDelta: 12,
      happinessDelta: 8,
      healthDelta: 25,
      hygieneDelta: 0
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#0ea5e9',
      secondary: '#0369a1',
      highlight: '#bae6fd'
    }
  },
  'enzymatic-digest-tonic': {
    id: 'enzymatic-digest-tonic',
    name: 'Tônico Digestivo Enzimático',
    description: 'Remédio específico para curar Congestão por Excesso de Comida (indigestão).',
    category: 'medicine',
    rarity: 'uncommon',
    curesDiseaseId: 'overeating_indigestion',
    priceCoins: 45,
    nutrition: {
      hungerRestore: -15,
      thirstRestore: 12,
      energyDelta: 10,
      happinessDelta: 12,
      healthDelta: 25,
      hygieneDelta: 0
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#84cc16',
      secondary: '#4d7c0f',
      highlight: '#ecfccb'
    }
  },
  'antitoxin-charcoal-extract': {
    id: 'antitoxin-charcoal-extract',
    name: 'Extrato Antitoxina de Carvão Vulcânico',
    description: 'Remédio específico para curar Intoxicação por Dieta Incompatível (alimento proibido).',
    category: 'medicine',
    rarity: 'rare',
    curesDiseaseId: 'food_poisoning',
    priceCoins: 55,
    nutrition: {
      hungerRestore: 5,
      thirstRestore: 15,
      energyDelta: 10,
      happinessDelta: 10,
      healthDelta: 30,
      hygieneDelta: 5
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#14b8a6',
      secondary: '#0f766e',
      highlight: '#99f6e4'
    }
  },
  'antiseptic-spore-salve': {
    id: 'antiseptic-spore-salve',
    name: 'Bálsamo Antisséptico Purificador',
    description: 'Remédio específico para curar Infecção Parasitária causada por falta de higiene.',
    category: 'medicine',
    rarity: 'uncommon',
    curesDiseaseId: 'parasitic_infection',
    priceCoins: 45,
    nutrition: {
      hungerRestore: 0,
      thirstRestore: 5,
      energyDelta: 8,
      happinessDelta: 10,
      healthDelta: 25,
      hygieneDelta: 45
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#2dd4bf',
      secondary: '#0d9488',
      highlight: '#ccfbf1'
    }
  },
  'adrenal-stamina-ampoule': {
    id: 'adrenal-stamina-ampoule',
    name: 'Ampola Revitalizante de Vigor',
    description: 'Remédio específico para curar Estafa e Exaustão Crônica causada por falta de descanso.',
    category: 'medicine',
    rarity: 'uncommon',
    curesDiseaseId: 'chronic_exhaustion',
    priceCoins: 50,
    nutrition: {
      hungerRestore: 5,
      thirstRestore: 10,
      energyDelta: 50,
      happinessDelta: 10,
      healthDelta: 25,
      hygieneDelta: 0
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#eab308',
      secondary: '#a16207',
      highlight: '#fef08a'
    }
  },
  'serotonin-aura-nectar': {
    id: 'serotonin-aura-nectar',
    name: 'Néctar Floral da Serenidade',
    description: 'Remédio específico para curar Melancolia Elemental causada por falta de afeto.',
    category: 'medicine',
    rarity: 'uncommon',
    curesDiseaseId: 'elemental_melancholy',
    priceCoins: 50,
    nutrition: {
      hungerRestore: 5,
      thirstRestore: 10,
      energyDelta: 15,
      happinessDelta: 45,
      healthDelta: 25,
      hygieneDelta: 5
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#ec4899',
      secondary: '#be185d',
      highlight: '#fbcfe8'
    }
  },
  'vitality-herbal-elixir': {
    id: 'vitality-herbal-elixir',
    name: 'Elixir Herbal de Vitalidade (Panaceia)',
    description: 'Panaceia ancestral rara capaz de curar simultaneamente qualquer doença ativa e restaurar a saúde.',
    category: 'medicine',
    rarity: 'legendary',
    curesDiseaseId: 'all',
    priceCoins: 120,
    nutrition: {
      hungerRestore: 8,
      thirstRestore: 15,
      energyDelta: 15,
      happinessDelta: 10,
      healthDelta: 38,
      hygieneDelta: 5
    },
    attributeBonus: {
      endurance: 1
    },
    pixelColors: {
      primary: '#10b981',
      secondary: '#059669',
      highlight: '#a7f3d0'
    }
  },
  'awakening-fruit': {
    id: 'awakening-fruit',
    name: 'Fruta do Despertar',
    description: 'Fruto místico e amargo que desperta instantaneamente qualquer dinossauro adormecido. Reduz todos os status para níveis baixos.',
    category: 'fruit',
    rarity: 'rare',
    priceCoins: 100,
    nutrition: {
      hungerRestore: 0,
      thirstRestore: 0,
      energyDelta: 0,
      happinessDelta: 0,
      healthDelta: 0,
      hygieneDelta: 0
    },
    attributeBonus: {},
    pixelColors: {
      primary: '#f59e0b',
      secondary: '#9333ea',
      highlight: '#fbbf24'
    }
  }
};

export const FOOD_CATALOG: Readonly<Record<string, FoodItemDefinition>> = Object.fromEntries(
  Object.entries(RAW_FOOD_CATALOG).map(([id, def]) => [
    id,
    {
      ...def,
      pixelArt: FOOD_PIXEL_ARTS[id]
    }
  ])
);

export function listAllFoods(): readonly FoodItemDefinition[] {
  return Object.values(FOOD_CATALOG);
}

export function getFoodById(foodId: string): FoodItemDefinition {
  return FOOD_CATALOG[foodId];
}

export function evaluateDietaryPreference(
  species: CharacterSpeciesDefinition,
  foodId: string
): DietaryPreference {
  if (foodId === 'awakening-fruit') return 'accepted';
  if (species.favoriteFoodIds.includes(foodId)) return 'favorite';
  if (species.forbiddenFoodIds.includes(foodId)) return 'forbidden';
  return 'accepted';
}

export function feedCharacter(
  species: CharacterSpeciesDefinition,
  foodId: string,
  timestampMs: number,
  currentHunger: number = 50,
  currentThirst: number = 50,
  activeDiseases: readonly ActiveDisease[] = []
): FeedingReaction {
  const food = getFoodById(foodId);
  const preference = evaluateDietaryPreference(species, foodId);

  if (foodId === 'awakening-fruit') {
    return {
      characterId: species.id,
      foodId,
      preference: 'accepted',
      accepted: true,
      satisfactionLevel: 'satisfied',
      appliedNeedsDelta: {
        hunger: 0,
        thirst: 0,
        energy: 0,
        happiness: 0,
        health: 0,
        hygiene: 0
      },
      appliedAttributeDelta: {},
      experienceGained: 5,
      message: `${species.displayName} consumiu a Fruta do Despertar! O forte choque amargo despertou a criatura, deixando todos os seus status em níveis baixos (20%).`,
      timestampMs
    };
  }

  // Medicine administration validation
  if (food.category === 'medicine' && food.curesDiseaseId) {
    const hasTargetDisease =
      food.curesDiseaseId === 'all'
        ? activeDiseases.length > 0
        : activeDiseases.some((d) => d.id === food.curesDiseaseId);

    if (!hasTargetDisease) {
      return {
        characterId: species.id,
        foodId,
        preference: 'accepted',
        accepted: false,
        satisfactionLevel: 'disgusted',
        appliedNeedsDelta: {
          hunger: 0,
          thirst: 0,
          energy: -5,
          happiness: -10,
          health: -5,
          hygiene: 0
        },
        appliedAttributeDelta: {},
        experienceGained: 0,
        message: `${species.displayName} não possui a enfermidade tratada por ${food.name}! Medicamento desnecessário rejeitado sem concessão de XP.`,
        timestampMs
      };
    }

    return {
      characterId: species.id,
      foodId,
      preference: 'accepted',
      accepted: true,
      satisfactionLevel: 'satisfied',
      curedDiseaseId: food.curesDiseaseId,
      appliedNeedsDelta: {
        hunger: food.nutrition.hungerRestore,
        thirst: food.nutrition.thirstRestore,
        energy: food.nutrition.energyDelta,
        happiness: food.nutrition.happinessDelta,
        health: food.nutrition.healthDelta,
        hygiene: food.nutrition.hygieneDelta
      },
      appliedAttributeDelta: food.attributeBonus,
      experienceGained: 8,
      message: `${species.displayName} recebeu o tratamento correto com ${food.name}!`,
      timestampMs
    };
  }

  // Hydration overdrinking check: feeding water when already fully hydrated (thirst >= 95)
  if (food.category === 'hydration' && currentThirst >= 95) {
    return {
      characterId: species.id,
      foodId,
      preference: 'accepted',
      accepted: false,
      satisfactionLevel: 'disgusted',
      appliedNeedsDelta: {
        hunger: 0,
        thirst: 2,
        energy: -5,
        happiness: -10,
        health: 0,
        hygiene: 0
      },
      appliedAttributeDelta: {},
      experienceGained: 0,
      message: `${species.displayName} já está totalmente saciado de água (${currentThirst}%) e recusou beber mais! Forçar hidratação causou empanturramento.`,
      timestampMs
    };
  }

  if (preference === 'forbidden') {
    return {
      characterId: species.id,
      foodId,
      preference,
      accepted: false,
      satisfactionLevel: 'poisoned',
      contractedDiseaseId: 'food_poisoning',
      appliedNeedsDelta: {
        hunger: 4,
        thirst: -8,
        energy: -10,
        happiness: -20,
        health: -18,
        hygiene: -6
      },
      appliedAttributeDelta: {},
      experienceGained: 0,
      message: `${species.displayName} rejeitou ${food.name} e contraiu Intoxicação por Dieta Incompatível! Trate com Extrato Antitoxina.`,
      timestampMs
    };
  }

  // Overeating check: feeding solid food when already stuffed (hunger >= 95) causes indigestion!
  if (food.category !== 'hydration' && currentHunger >= 95) {
    return {
      characterId: species.id,
      foodId,
      preference,
      accepted: false,
      satisfactionLevel: 'disgusted',
      contractedDiseaseId: 'overeating_indigestion',
      appliedNeedsDelta: {
        hunger: 5,
        thirst: -6,
        energy: -10,
        happiness: -15,
        health: -14,
        hygiene: -4
      },
      appliedAttributeDelta: {},
      experienceGained: 0,
      message: `${species.displayName} já estava de barriga cheia e passou mal com Congestão por Excesso de Comida! Trate com Tônico Digestivo.`,
      timestampMs
    };
  }

  const multiplier = preference === 'favorite' ? 1.35 : 1.0;
  const appliedNeedsDelta = {
    hunger: Math.round(food.nutrition.hungerRestore * multiplier),
    thirst: Math.round(food.nutrition.thirstRestore * multiplier),
    energy: Math.round(food.nutrition.energyDelta * multiplier),
    happiness: Math.round(food.nutrition.happinessDelta * multiplier),
    health: Math.round(food.nutrition.healthDelta * multiplier),
    hygiene: food.nutrition.hygieneDelta
  };

  return {
    characterId: species.id,
    foodId,
    preference,
    accepted: true,
    satisfactionLevel: preference === 'favorite' ? 'ecstatic' : 'satisfied',
    appliedNeedsDelta,
    appliedAttributeDelta: preference === 'favorite' ? food.attributeBonus : {},
    experienceGained: preference === 'favorite' ? 10 : 5,
    message:
      preference === 'favorite'
        ? `${species.displayName} devorou ${food.name} com entusiasmo radiante! (+Atributos)`
        : `${species.displayName} consumiu ${food.name} com satisfação.`,
    timestampMs
  };
}
