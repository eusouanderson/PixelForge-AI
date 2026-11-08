import type {
  CharacterEvolutionRule,
  CharacterId,
  CharacterSpeciesDefinition
} from '../types';

export const MAX_NATURAL_LIFESPAN_HOURS = 720; // 30 real days (1 month)

const STANDARD_EVOLUTION_RULES: readonly CharacterEvolutionRule[] = [
  {
    fromStage: 'ovo',
    toStage: 'baby',
    requiredLevel: 1,
    requiredAgeHours: 0,
    minHealth: 50,
    minHappiness: 50
  },
  {
    fromStage: 'baby',
    toStage: 'crianca',
    requiredLevel: 3,
    requiredAgeHours: 24,
    minHealth: 65,
    minHappiness: 60
  },
  {
    fromStage: 'crianca',
    toStage: 'pre-adolescente',
    requiredLevel: 6,
    requiredAgeHours: 96,
    minHealth: 70,
    minHappiness: 65
  },
  {
    fromStage: 'pre-adolescente',
    toStage: 'adolescente',
    requiredLevel: 10,
    requiredAgeHours: 240,
    minHealth: 75,
    minHappiness: 70
  },
  {
    fromStage: 'adolescente',
    toStage: 'adulto',
    requiredLevel: 15,
    requiredAgeHours: 432,
    minHealth: 80,
    minHappiness: 75
  }
];

export const CHARACTER_SPECIES_REGISTRY: Readonly<Record<CharacterId, CharacterSpeciesDefinition>> = {
  ignisauro: {
    id: 'ignisauro',
    name: 'Ignisauro',
    displayName: 'Ignisauro',
    scientificName: 'Ignisaurus Rex',
    species: 'T-Rex / Dragão Vulcânico',
    description:
      'Terópode pré-histórico de escamas vulcânicas terracota, coroa de chamas esmeralda e núcleo de magma vivo.',
    lore: 'Nascido nas fissuras geotérmicas da Caldeira Ancestral, o Ignisauro canaliza o calor do manto terrestre através de suas placas dorsais.',
    element: 'fire',
    elementLabel: 'Fogo e Magma Vulcânico',
    personality: {
      archetype: 'Guardião Impulsivo da Caldeira',
      traits: ['Corajoso', 'Caloroso', 'Protetor'],
      favoriteActivityId: 'lava-sprint',
      dislikedActivityId: 'cryo-meditation',
      temper: 'ferocious'
    },
    visualTraits: {
      silhouetteDescription:
        'Coroa de chamas verde-esmeralda, 3 chifres vulcânicos curvados, ombros de basalto com espinhos e peitoral com fendas de magma.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#fde047',
        pupilColor: '#0f172a',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#c2410c',
        belly: '#facc15',
        crest: '#059669',
        highlight: '#fb923c'
      }
    },
    environmentId: 'volcanic-caldera',
    particlePresetId: 'ignisauro-magma-embers',
    favoriteFoodIds: ['volcanic-roast-meat'],
    acceptedFoodIds: ['golden-starburst-sunpeach', 'emerald-crystal-geode', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['frosted-crystal-berry', 'glowing-swamp-mushroom'],
    baseAttributes: {
      strength: 18,
      defense: 14,
      agility: 12,
      intelligence: 10,
      endurance: 15,
      elementalAffinity: 17
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  glacissauro: {
    id: 'glacissauro',
    name: 'Glacissauro',
    displayName: 'Glacissauro',
    scientificName: 'Cryosaurus Glacius',
    species: 'Triceratops / Anquilossauro Glacial',
    description:
      'Encouraçado criogênico ancestral com escudo craniano hexagonal de gelo, três chifres cristalinos e clava caudal.',
    lore: 'Forjado nas geleiras eternas do polo ancestral, seu escudo refrata a luz boreal e congela qualquer ameaça.',
    element: 'ice',
    elementLabel: 'Gelo e Cristal Criogênico',
    personality: {
      archetype: 'Sentinela Serena da Tundra',
      traits: ['Calmo', 'Resiliente', 'Leal'],
      favoriteActivityId: 'cryo-meditation',
      dislikedActivityId: 'lava-sprint',
      temper: 'stoic'
    },
    visualTraits: {
      silhouetteDescription:
        'Escudo craniano hexagonal de gelo, 3 chifres longos de cristal ciano, ombreiras de cristal e cauda com clava criogênica.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#38bdf8',
        pupilColor: '#082f49',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#0284c7',
        belly: '#bae6fd',
        crest: '#38bdf8',
        highlight: '#7dd3fc'
      }
    },
    environmentId: 'glacial-sanctuary',
    particlePresetId: 'glacissauro-frost-crystals',
    favoriteFoodIds: ['frosted-crystal-berry'],
    acceptedFoodIds: ['sky-winged-cloudberry', 'emerald-crystal-geode', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['volcanic-roast-meat', 'glowing-swamp-mushroom'],
    baseAttributes: {
      strength: 14,
      defense: 19,
      agility: 9,
      intelligence: 13,
      endurance: 18,
      elementalAffinity: 15
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  electrossauro: {
    id: 'electrossauro',
    name: 'Electrossauro',
    displayName: 'Electrossauro',
    scientificName: 'Fulgursaurus Rex',
    species: 'Dilofossauro / Velociraptor Galvânico',
    description:
      'Predador da tempestade com babado lateral elétrico aberto, antenas para-raios duplas e cauda em zigue-zague.',
    lore: 'Habita os picos magnéticos onde as tempestades nunca cessam, convertendo relâmpagos em reflexos supersônicos.',
    element: 'electric',
    elementLabel: 'Eletricidade e Tempestade Galvânica',
    personality: {
      archetype: 'Velocista Galvânico',
      traits: ['Elétrico', 'Curioso', 'Brincalhão'],
      favoriteActivityId: 'thunder-dash',
      dislikedActivityId: 'monolith-guard',
      temper: 'energetic'
    },
    visualTraits: {
      silhouetteDescription:
        'Babado lateral elétrico (frill) expandido dos dois lados da cabeça, antenas para-raios duplas, bobinas nos ombros e cauda em raio.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#06b6d4',
        pupilColor: '#083344',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#ca8a04',
        belly: '#1e293b',
        crest: '#06b6d4',
        highlight: '#fde047'
      }
    },
    environmentId: 'storm-spire-crag',
    particlePresetId: 'electrossauro-volt-sparks',
    favoriteFoodIds: ['plasma-thunder-fruit'],
    acceptedFoodIds: ['sky-winged-cloudberry', 'golden-starburst-sunpeach', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['emerald-crystal-geode', 'crimson-shadow-soulfruit'],
    baseAttributes: {
      strength: 13,
      defense: 10,
      agility: 20,
      intelligence: 15,
      endurance: 12,
      elementalAffinity: 18
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  toxissauro: {
    id: 'toxissauro',
    name: 'Toxissauro',
    displayName: 'Toxissauro',
    scientificName: 'Venomousaurus Titan',
    species: 'Braquiossauro / Anfíbio-Mutante Abissal',
    description:
      'Titã pantanoso com bolsas de gás tóxico infladas nas bochechas, chifres-cogumelo bioluminescentes e ferrão caudal.',
    lore: 'Alquimista natural dos pântanos de turfa, sintetiza esporos medicinais e ácidos luminosos em sua carapaça.',
    element: 'poison',
    elementLabel: 'Veneno e Bioluminescência Ácida',
    personality: {
      archetype: 'Alquimista do Pântano',
      traits: ['Observador', 'Astuto', 'Pacífico'],
      favoriteActivityId: 'spore-exploration',
      dislikedActivityId: 'solar-bask',
      temper: 'curious'
    },
    visualTraits: {
      silhouetteDescription:
        'Bolsas de gás tóxico infladas nas bochechas, 3 chifres-cogumelo bioluminescentes, pústulas ácidas e cauda de escorpião.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#84cc16',
        pupilColor: '#14532d',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#7e22ce',
        belly: '#bef264',
        crest: '#22c55e',
        highlight: '#a855f7'
      }
    },
    environmentId: 'bioluminescent-bog',
    particlePresetId: 'toxissauro-acid-bubbles',
    favoriteFoodIds: ['glowing-swamp-mushroom'],
    acceptedFoodIds: ['crimson-shadow-soulfruit', 'volcanic-roast-meat', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['golden-starburst-sunpeach', 'frosted-crystal-berry'],
    baseAttributes: {
      strength: 15,
      defense: 16,
      agility: 10,
      intelligence: 16,
      endurance: 17,
      elementalAffinity: 16
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  terrassauro: {
    id: 'terrassauro',
    name: 'Terrassauro',
    displayName: 'Terrassauro',
    scientificName: 'Geosaurus Titan',
    species: 'Paquicefalossauro / Estegossauro / Golem Tectônico',
    description:
      'Colosso tectônico com domo craniano monolítico de rocha, placas dorsais de esmeralda e manoplas esmagadoras.',
    lore: 'Esculpido a partir das veias de esmeralda das montanhas primordiais, protege o santuário com força inabalável.',
    element: 'earth',
    elementLabel: 'Terra e Cristal de Esmeralda',
    personality: {
      archetype: 'Colosso Gentil das Montanhas',
      traits: ['Inabalável', 'Paciente', 'Forte'],
      favoriteActivityId: 'monolith-guard',
      dislikedActivityId: 'thunder-dash',
      temper: 'gentle'
    },
    visualTraits: {
      silhouetteDescription:
        'Domo craniano monolítico arredondado com runas esmeralda, placas dorsais pentagonais, manoplas de golem e cauda Thagomizer.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#f59e0b',
        pupilColor: '#1c1917',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#78716c',
        belly: '#d97706',
        crest: '#10b981',
        highlight: '#a8a29e'
      }
    },
    environmentId: 'emerald-cavern-monolith',
    particlePresetId: 'terrassauro-emerald-shards',
    favoriteFoodIds: ['emerald-crystal-geode'],
    acceptedFoodIds: ['volcanic-roast-meat', 'frosted-crystal-berry', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['plasma-thunder-fruit', 'sky-winged-cloudberry'],
    baseAttributes: {
      strength: 19,
      defense: 20,
      agility: 8,
      intelligence: 11,
      endurance: 19,
      elementalAffinity: 14
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  aerossauro: {
    id: 'aerossauro',
    name: 'Aerossauro',
    displayName: 'Aerossauro',
    scientificName: 'Zephyrusaurus Rex',
    species: 'Pteranodon / Archaeopteryx Celeste',
    description:
      'Soberano alado dos ventos com crista real de três plumas altas, bico dourado, grandes asas emplumadas e cauda em leque.',
    lore: 'Plana sobre as correntes ascendentes das ilhas flutuantes, anunciando a chegada das brisas celestes.',
    element: 'air',
    elementLabel: 'Vento e Tempestade Celeste',
    personality: {
      archetype: 'Acrobata das Nuvens',
      traits: ['Livre', 'Ágil', 'Elegante'],
      favoriteActivityId: 'sky-glide',
      dislikedActivityId: 'monolith-guard',
      temper: 'energetic'
    },
    visualTraits: {
      silhouetteDescription:
        'Crista real de 3 plumas altas, bico dourado aerodinâmico, grandes asas emplumadas abertas, gola nívea e cauda em leque.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#fde047',
        pupilColor: '#042f2e',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#14b8a6',
        belly: '#f8fafc',
        crest: '#38bdf8',
        highlight: '#2dd4bf'
      }
    },
    environmentId: 'floating-sky-sanctuary',
    particlePresetId: 'aerossauro-zephyr-feathers',
    favoriteFoodIds: ['sky-winged-cloudberry'],
    acceptedFoodIds: ['plasma-thunder-fruit', 'frosted-crystal-berry', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['emerald-crystal-geode', 'glowing-swamp-mushroom'],
    baseAttributes: {
      strength: 12,
      defense: 11,
      agility: 20,
      intelligence: 16,
      endurance: 13,
      elementalAffinity: 17
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  umbrassauro: {
    id: 'umbrassauro',
    name: 'Umbrassauro',
    displayName: 'Umbrassauro',
    scientificName: 'Nyxosaurus Rex',
    species: 'Carnotauro / Ceifador Abissal',
    description:
      'Predador noturno com chifres taurinos horizontais, elmo craniano de osso pálido com joia carmesim e cauda em foice.',
    lore: 'Vigia silencioso do Vale de Obsidiana, guia as chamas espirituais carmesim através da escuridão ancestral.',
    element: 'shadow',
    elementLabel: 'Sombra e Fogo-Fátuo Carmesim',
    personality: {
      archetype: 'Vigia Noturno de Obsidiana',
      traits: ['Misterioso', 'Focado', 'Silencioso'],
      favoriteActivityId: 'umbral-meditation',
      dislikedActivityId: 'solar-bask',
      temper: 'mysterious'
    },
    visualTraits: {
      silhouetteDescription:
        'Chifres taurinos largos projetados horizontalmente, elmo craniano de osso com joia carmesim, costelas externas e foice caudal.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#f43f5e',
        pupilColor: '#09090b',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#27272a',
        belly: '#9f1239',
        crest: '#d6d3d1',
        highlight: '#3f3f46'
      }
    },
    environmentId: 'umbral-obsidian-crypt',
    particlePresetId: 'umbrassauro-crimson-wisps',
    favoriteFoodIds: ['crimson-shadow-soulfruit'],
    acceptedFoodIds: ['volcanic-roast-meat', 'glowing-swamp-mushroom', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['golden-starburst-sunpeach', 'plasma-thunder-fruit'],
    baseAttributes: {
      strength: 18,
      defense: 13,
      agility: 17,
      intelligence: 17,
      endurance: 14,
      elementalAffinity: 19
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  },
  solassauro: {
    id: 'solassauro',
    name: 'Solassauro',
    displayName: 'Solassauro',
    scientificName: 'Heliosaurus Imperator',
    species: 'Amargassauro / Dragão-Leão Solar',
    description:
      'Imperador radiante com juba circular de 10 raios solares, couraça branco-platina e ouro com brasão do sol e maça caudal.',
    lore: 'Descendente direto da primeira aurora, sua juba irradia luz dourada capaz de dissipar qualquer penumbra.',
    element: 'light',
    elementLabel: 'Luz Solar e Ouro Sagrado',
    personality: {
      archetype: 'Imperador Radiante da Aurora',
      traits: ['Majestoso', 'Generoso', 'Inspirador'],
      favoriteActivityId: 'solar-bask',
      dislikedActivityId: 'umbral-meditation',
      temper: 'noble'
    },
    visualTraits: {
      silhouetteDescription:
        'Juba solar de 360 graus formando uma coroa de 10 raios solares, armadura imperial branco-platina com brasão do sol e maça-solar.',
      orientation: 'frontal_binocular',
      logicalDimensions: { width: 32, height: 32 },
      ocularGenetics: {
        eyeColor: '#38bdf8',
        pupilColor: '#0c4a6e',
        specularColor: '#ffffff'
      },
      primaryColors: {
        base: '#f59e0b',
        belly: '#f8fafc',
        crest: '#f97316',
        highlight: '#fde047'
      }
    },
    environmentId: 'helios-golden-citadel',
    particlePresetId: 'solassauro-solar-corona',
    favoriteFoodIds: ['golden-starburst-sunpeach'],
    acceptedFoodIds: ['plasma-thunder-fruit', 'sky-winged-cloudberry', 'thermal-spring-water', 'vitality-herbal-elixir'],
    forbiddenFoodIds: ['crimson-shadow-soulfruit', 'glowing-swamp-mushroom'],
    baseAttributes: {
      strength: 17,
      defense: 17,
      agility: 15,
      intelligence: 18,
      endurance: 16,
      elementalAffinity: 20
    },
    evolutionRules: STANDARD_EVOLUTION_RULES
  }
};

export function listAllCharacterSpecies(): readonly CharacterSpeciesDefinition[] {
  return Object.values(CHARACTER_SPECIES_REGISTRY);
}

export function getCharacterSpeciesById(characterId: CharacterId): CharacterSpeciesDefinition {
  return CHARACTER_SPECIES_REGISTRY[characterId];
}

export function pickRandomCharacterId(randomZeroToOne: number = Math.random()): CharacterId {
  const all = listAllCharacterSpecies();
  const clamped = Math.max(0, Math.min(0.999999, randomZeroToOne));
  const index = Math.floor(clamped * all.length);
  return all[index].id;
}


