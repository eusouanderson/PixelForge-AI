import type { CharacterSpeciesDefinition } from '@/domains/characters/types';
import type {
  DietaryPreference,
  FeedingReaction,
  FoodItemDefinition
} from '../types';

export const FOOD_CATALOG: Readonly<Record<string, FoodItemDefinition>> = {
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
      thirstRestore: -2,
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
      thirstRestore: 16,
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
      thirstRestore: 8,
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
      thirstRestore: 6,
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
      thirstRestore: 0,
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
      thirstRestore: 14,
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
      thirstRestore: 10,
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
      thirstRestore: 12,
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
      hungerRestore: 2,
      thirstRestore: 32,
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
  'vitality-herbal-elixir': {
    id: 'vitality-herbal-elixir',
    name: 'Elixir Herbal de Vitalidade',
    description: 'Tônico ancestral restaurador que cura febres, recupera a saúde e reanima criaturas debilitadas.',
    category: 'medicine',
    rarity: 'rare',
    priceCoins: 40,
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
  }
};

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
  if (species.favoriteFoodIds.includes(foodId)) return 'favorite';
  if (species.forbiddenFoodIds.includes(foodId)) return 'forbidden';
  return 'accepted';
}

export function feedCharacter(
  species: CharacterSpeciesDefinition,
  foodId: string,
  timestampMs: number
): FeedingReaction {
  const food = getFoodById(foodId);
  const preference = evaluateDietaryPreference(species, foodId);

  if (preference === 'forbidden') {
    return {
      characterId: species.id,
      foodId,
      preference,
      accepted: false,
      satisfactionLevel: 'poisoned',
      appliedNeedsDelta: {
        hunger: 4,
        thirst: -5,
        energy: -8,
        happiness: -18,
        health: -14,
        hygiene: -6
      },
      appliedAttributeDelta: {},
      experienceGained: 0,
      message: `${species.displayName} rejeitou ${food.name}! Esse alimento é incompatível com sua biologia elemental.`,
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
    experienceGained: preference === 'favorite' ? 35 : 20,
    message:
      preference === 'favorite'
        ? `${species.displayName} devorou ${food.name} com entusiasmo radiante! (+Atributos)`
        : `${species.displayName} consumiu ${food.name} com satisfação.`,
    timestampMs
  };
}
