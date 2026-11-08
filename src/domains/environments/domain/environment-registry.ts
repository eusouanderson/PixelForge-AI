import type { CharacterId } from '@/domains/characters/types';
import type { CharacterEnvironmentConfig } from '../types';

export const ENVIRONMENT_REGISTRY: Readonly<Record<CharacterId, CharacterEnvironmentConfig>> = {
  ignisauro: {
    id: 'volcanic-caldera',
    characterId: 'ignisauro',
    name: 'Caldeira Vulcânica Ancestral',
    description: 'Cratera de basalto com veios de magma incandescente e pilares vulcânicos.',
    element: 'fire',
    lighting: {
      clearColorHex: '#1a0905',
      ambientColorHex: '#451a03',
      groundColorHex: '#27120b',
      mainLightColorHex: '#fb923c',
      mainLightIntensity: 1.25,
      rimLightColorHex: '#10b981',
      rimLightIntensity: 0.7,
      fogColorHex: '#290f07',
      fogDensity: 0.035
    },
    pedestalColorHex: '#292524',
    pedestalAccentHex: '#ea580c',
    groundColorHex: '#1c1917',
    props: [
      {
        id: 'igni-monolith-left',
        shape: 'monolith',
        position: { x: -1.8, y: 0.3, z: 1.6 },
        scale: { x: 0.5, y: 1.6, z: 0.5 },
        primaryColorHex: '#292524',
        emissiveColorHex: '#c2410c',
        floatAmplitude: 0.03,
        rotationSpeed: 0.002
      },
      {
        id: 'igni-lava-right',
        shape: 'lava-pool',
        position: { x: 1.7, y: -0.7, z: 1.4 },
        scale: { x: 0.8, y: 0.25, z: 0.8 },
        primaryColorHex: '#ea580c',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.04,
        rotationSpeed: 0.004
      }
    ]
  },
  glacissauro: {
    id: 'glacial-sanctuary',
    characterId: 'glacissauro',
    name: 'Santuário da Geleira Eterna',
    description: 'Caverna de gelo cristalino com obeliscos criogênicos e luz boreal.',
    element: 'ice',
    lighting: {
      clearColorHex: '#041322',
      ambientColorHex: '#0c4a6e',
      groundColorHex: '#082f49',
      mainLightColorHex: '#7dd3fc',
      mainLightIntensity: 1.2,
      rimLightColorHex: '#e0f2fe',
      rimLightIntensity: 0.85,
      fogColorHex: '#082f49',
      fogDensity: 0.03
    },
    pedestalColorHex: '#0369a1',
    pedestalAccentHex: '#38bdf8',
    groundColorHex: '#082f49',
    props: [
      {
        id: 'glaci-pillar-left',
        shape: 'crystal-pillar',
        position: { x: -1.7, y: 0.4, z: 1.5 },
        scale: { x: 0.45, y: 1.8, z: 0.45 },
        primaryColorHex: '#0284c7',
        emissiveColorHex: '#38bdf8',
        floatAmplitude: 0.05,
        rotationSpeed: 0.003
      },
      {
        id: 'glaci-pillar-right',
        shape: 'crystal-pillar',
        position: { x: 1.7, y: 0.2, z: 1.6 },
        scale: { x: 0.4, y: 1.4, z: 0.4 },
        primaryColorHex: '#38bdf8',
        emissiveColorHex: '#bae6fd',
        floatAmplitude: 0.06,
        rotationSpeed: -0.003
      }
    ]
  },
  electrossauro: {
    id: 'storm-spire-crag',
    characterId: 'electrossauro',
    name: 'Pico dos Para-Raios de Basalto',
    description: 'Platô magnético elevado com bobinas naturais de cristal e arcos voltaicos.',
    element: 'electric',
    lighting: {
      clearColorHex: '#070f1e',
      ambientColorHex: '#1e293b',
      groundColorHex: '#0f172a',
      mainLightColorHex: '#fde047',
      mainLightIntensity: 1.3,
      rimLightColorHex: '#06b6d4',
      rimLightIntensity: 0.9,
      fogColorHex: '#0f172a',
      fogDensity: 0.03
    },
    pedestalColorHex: '#1e293b',
    pedestalAccentHex: '#06b6d4',
    groundColorHex: '#090d16',
    props: [
      {
        id: 'electro-coil-left',
        shape: 'floating-ring',
        position: { x: -1.7, y: 0.6, z: 1.4 },
        scale: { x: 0.55, y: 1.2, z: 0.55 },
        primaryColorHex: '#ca8a04',
        emissiveColorHex: '#22d3ee',
        floatAmplitude: 0.12,
        rotationSpeed: 0.015
      },
      {
        id: 'electro-coil-right',
        shape: 'floating-ring',
        position: { x: 1.7, y: 0.5, z: 1.4 },
        scale: { x: 0.55, y: 1.2, z: 0.55 },
        primaryColorHex: '#06b6d4',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.12,
        rotationSpeed: -0.015
      }
    ]
  },
  toxissauro: {
    id: 'bioluminescent-bog',
    characterId: 'toxissauro',
    name: 'Pântano Bioluminescente de Turfa',
    description: 'Charco místico de fungos gigantes bioluminescentes e vapores verde-limão.',
    element: 'poison',
    lighting: {
      clearColorHex: '#120721',
      ambientColorHex: '#3b0764',
      groundColorHex: '#14532d',
      mainLightColorHex: '#a3e635',
      mainLightIntensity: 1.15,
      rimLightColorHex: '#a855f7',
      rimLightIntensity: 0.85,
      fogColorHex: '#1e0b36',
      fogDensity: 0.04
    },
    pedestalColorHex: '#4c1d95',
    pedestalAccentHex: '#84cc16',
    groundColorHex: '#1a0933',
    props: [
      {
        id: 'toxi-shroom-left',
        shape: 'mushroom',
        position: { x: -1.7, y: 0.1, z: 1.5 },
        scale: { x: 0.6, y: 1.3, z: 0.6 },
        primaryColorHex: '#7e22ce',
        emissiveColorHex: '#84cc16',
        floatAmplitude: 0.04,
        rotationSpeed: 0.002
      },
      {
        id: 'toxi-shroom-right',
        shape: 'mushroom',
        position: { x: 1.7, y: 0.0, z: 1.5 },
        scale: { x: 0.5, y: 1.1, z: 0.5 },
        primaryColorHex: '#22c55e',
        emissiveColorHex: '#a855f7',
        floatAmplitude: 0.05,
        rotationSpeed: -0.002
      }
    ]
  },
  terrassauro: {
    id: 'emerald-cavern-monolith',
    characterId: 'terrassauro',
    name: 'Santuário Monolítico de Esmeralda',
    description: 'Cânion tectônico cravejado de drusas de esmeralda e monólitos de granito.',
    element: 'earth',
    lighting: {
      clearColorHex: '#14110f',
      ambientColorHex: '#292524',
      groundColorHex: '#1c1917',
      mainLightColorHex: '#f59e0b',
      mainLightIntensity: 1.2,
      rimLightColorHex: '#10b981',
      rimLightIntensity: 0.8,
      fogColorHex: '#1c1917',
      fogDensity: 0.028
    },
    pedestalColorHex: '#44403c',
    pedestalAccentHex: '#10b981',
    groundColorHex: '#1c1917',
    props: [
      {
        id: 'terra-monolith-left',
        shape: 'monolith',
        position: { x: -1.8, y: 0.35, z: 1.6 },
        scale: { x: 0.65, y: 1.7, z: 0.65 },
        primaryColorHex: '#57534e',
        emissiveColorHex: '#10b981',
        floatAmplitude: 0.02,
        rotationSpeed: 0.001
      },
      {
        id: 'terra-emerald-right',
        shape: 'crystal-pillar',
        position: { x: 1.75, y: 0.25, z: 1.5 },
        scale: { x: 0.5, y: 1.5, z: 0.5 },
        primaryColorHex: '#059669',
        emissiveColorHex: '#34d399',
        floatAmplitude: 0.04,
        rotationSpeed: 0.003
      }
    ]
  },
  aerossauro: {
    id: 'floating-sky-sanctuary',
    characterId: 'aerossauro',
    name: 'Altar Flutuante dos Ventos',
    description: 'Ilha celeste suspensa entre correntes de ar turquesa e anéis eólicos.',
    element: 'air',
    lighting: {
      clearColorHex: '#062229',
      ambientColorHex: '#0f766e',
      groundColorHex: '#115e59',
      mainLightColorHex: '#e0f2fe',
      mainLightIntensity: 1.3,
      rimLightColorHex: '#2dd4bf',
      rimLightIntensity: 0.85,
      fogColorHex: '#083344',
      fogDensity: 0.025
    },
    pedestalColorHex: '#0d9488',
    pedestalAccentHex: '#fde047',
    groundColorHex: '#042f2e',
    props: [
      {
        id: 'aero-ring-left',
        shape: 'floating-ring',
        position: { x: -1.7, y: 0.7, z: 1.5 },
        scale: { x: 0.5, y: 1.1, z: 0.5 },
        primaryColorHex: '#f8fafc',
        emissiveColorHex: '#38bdf8',
        floatAmplitude: 0.16,
        rotationSpeed: 0.012
      },
      {
        id: 'aero-ring-right',
        shape: 'floating-ring',
        position: { x: 1.7, y: 0.8, z: 1.5 },
        scale: { x: 0.5, y: 1.1, z: 0.5 },
        primaryColorHex: '#2dd4bf',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.18,
        rotationSpeed: -0.012
      }
    ]
  },
  umbrassauro: {
    id: 'umbral-obsidian-crypt',
    characterId: 'umbrassauro',
    name: 'Vale de Obsidiana e Luar Carmesim',
    description: 'Santuário noturno de obsidiana polida iluminado por chamas espirituais carmesim.',
    element: 'shadow',
    lighting: {
      clearColorHex: '#09070d',
      ambientColorHex: '#18181b',
      groundColorHex: '#09090b',
      mainLightColorHex: '#f43f5e',
      mainLightIntensity: 1.15,
      rimLightColorHex: '#d6d3d1',
      rimLightIntensity: 0.75,
      fogColorHex: '#09090b',
      fogDensity: 0.042
    },
    pedestalColorHex: '#27272a',
    pedestalAccentHex: '#e11d48',
    groundColorHex: '#09090b',
    props: [
      {
        id: 'umbra-arch-left',
        shape: 'obsidian-arch',
        position: { x: -1.75, y: 0.4, z: 1.55 },
        scale: { x: 0.45, y: 1.75, z: 0.45 },
        primaryColorHex: '#18181b',
        emissiveColorHex: '#e11d48',
        floatAmplitude: 0.05,
        rotationSpeed: 0.004
      },
      {
        id: 'umbra-arch-right',
        shape: 'obsidian-arch',
        position: { x: 1.75, y: 0.4, z: 1.55 },
        scale: { x: 0.45, y: 1.75, z: 0.45 },
        primaryColorHex: '#27272a',
        emissiveColorHex: '#f43f5e',
        floatAmplitude: 0.05,
        rotationSpeed: -0.004
      }
    ]
  },
  solassauro: {
    id: 'helios-golden-citadel',
    characterId: 'solassauro',
    name: 'Templo Solar da Aurora Dourada',
    description: 'Cidadela radiante de mármore branco-platina e obeliscos solares dourados.',
    element: 'light',
    lighting: {
      clearColorHex: '#1c1204',
      ambientColorHex: '#78350f',
      groundColorHex: '#451a03',
      mainLightColorHex: '#fde047',
      mainLightIntensity: 1.35,
      rimLightColorHex: '#38bdf8',
      rimLightIntensity: 0.85,
      fogColorHex: '#291704',
      fogDensity: 0.022
    },
    pedestalColorHex: '#f59e0b',
    pedestalAccentHex: '#fef08a',
    groundColorHex: '#291504',
    props: [
      {
        id: 'sola-obelisk-left',
        shape: 'solar-obelisk',
        position: { x: -1.8, y: 0.45, z: 1.5 },
        scale: { x: 0.45, y: 1.8, z: 0.45 },
        primaryColorHex: '#f8fafc',
        emissiveColorHex: '#f59e0b',
        floatAmplitude: 0.08,
        rotationSpeed: 0.006
      },
      {
        id: 'sola-obelisk-right',
        shape: 'solar-obelisk',
        position: { x: 1.8, y: 0.45, z: 1.5 },
        scale: { x: 0.45, y: 1.8, z: 0.45 },
        primaryColorHex: '#f59e0b',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.08,
        rotationSpeed: -0.006
      }
    ]
  }
};

export function getCharacterEnvironmentConfig(
  characterId: CharacterId
): CharacterEnvironmentConfig {
  return ENVIRONMENT_REGISTRY[characterId];
}

