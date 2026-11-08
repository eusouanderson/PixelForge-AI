import type { CharacterId } from '@/domains/characters/types';
import type { CharacterEnvironmentConfig } from '../types';

export const ENVIRONMENT_REGISTRY: Readonly<Record<CharacterId, CharacterEnvironmentConfig>> = {
  ignisauro: {
    id: 'volcanic-caldera',
    characterId: 'ignisauro',
    name: 'Caldeira Vulcânica Ancestral',
    description: 'Cratera de basalto com veios de magma incandescente, fendas ativas e pilares vulcânicos.',
    element: 'fire',
    lighting: {
      clearColorHex: '#120503',
      ambientColorHex: '#451a03',
      groundColorHex: '#27120b',
      mainLightColorHex: '#fb923c',
      mainLightIntensity: 1.25,
      rimLightColorHex: '#10b981',
      rimLightIntensity: 0.7,
      fogColorHex: '#290f07',
      fogDensity: 0.035,
      pointLightColorHex: '#ea580c',
      pointLightIntensity: 0.9,
      pointLightPosition: { x: 1.7, y: -0.4, z: 1.4 }
    },
    pedestalColorHex: '#292524',
    pedestalAccentHex: '#ea580c',
    groundColorHex: '#1c1917',
    backdrop: {
      skyTopColorHex: '#120503',
      skyBottomColorHex: '#451006',
      horizonColorHex: '#ea580c',
      mountainColorHex: '#1c1917',
      mountainHighlightHex: '#b45309',
      celestialKind: 'moon',
      celestialColorHex: '#f97316'
    },
    props: [
      {
        id: 'igni-monolith-left',
        shape: 'monolith',
        position: { x: -1.8, y: 0.35, z: 1.6 },
        scale: { x: 0.5, y: 1.6, z: 0.5 },
        primaryColorHex: '#292524',
        emissiveColorHex: '#c2410c',
        floatAmplitude: 0.03,
        rotationSpeed: 0.002,
        depthLayer: 'midground'
      },
      {
        id: 'igni-lava-right',
        shape: 'lava-pool',
        position: { x: 1.7, y: -0.7, z: 1.4 },
        scale: { x: 0.8, y: 0.25, z: 0.8 },
        primaryColorHex: '#ea580c',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.04,
        rotationSpeed: 0.004,
        depthLayer: 'midground'
      },
      {
        id: 'igni-ember-fore-left',
        shape: 'monolith',
        position: { x: -2.1, y: -0.75, z: -0.3 },
        scale: { x: 0.35, y: 0.5, z: 0.35 },
        primaryColorHex: '#1c1917',
        emissiveColorHex: '#ea580c',
        floatAmplitude: 0.015,
        rotationSpeed: 0.001,
        depthLayer: 'foreground'
      },
      {
        id: 'igni-crag-fore-right',
        shape: 'monolith',
        position: { x: 2.1, y: -0.75, z: -0.3 },
        scale: { x: 0.35, y: 0.5, z: 0.35 },
        primaryColorHex: '#292524',
        emissiveColorHex: '#f97316',
        floatAmplitude: 0.015,
        rotationSpeed: -0.001,
        depthLayer: 'foreground'
      }
    ]
  },
  glacissauro: {
    id: 'glacial-sanctuary',
    characterId: 'glacissauro',
    name: 'Santuário da Geleira Eterna',
    description: 'Caverna polar cristalina com obeliscos criogênicos, agulhas de gelo e véus de aurora.',
    element: 'ice',
    lighting: {
      clearColorHex: '#020617',
      ambientColorHex: '#0c4a6e',
      groundColorHex: '#082f49',
      mainLightColorHex: '#7dd3fc',
      mainLightIntensity: 1.2,
      rimLightColorHex: '#e0f2fe',
      rimLightIntensity: 0.85,
      fogColorHex: '#082f49',
      fogDensity: 0.03,
      pointLightColorHex: '#38bdf8',
      pointLightIntensity: 0.85,
      pointLightPosition: { x: -1.75, y: 0.2, z: 1.5 }
    },
    pedestalColorHex: '#0369a1',
    pedestalAccentHex: '#38bdf8',
    groundColorHex: '#082f49',
    backdrop: {
      skyTopColorHex: '#020617',
      skyBottomColorHex: '#075985',
      horizonColorHex: '#38bdf8',
      mountainColorHex: '#082f49',
      mountainHighlightHex: '#bae6fd',
      celestialKind: 'aurora',
      celestialColorHex: '#2dd4bf'
    },
    props: [
      {
        id: 'glaci-pillar-left',
        shape: 'crystal-pillar',
        position: { x: -1.75, y: 0.45, z: 1.5 },
        scale: { x: 0.45, y: 1.8, z: 0.45 },
        primaryColorHex: '#0284c7',
        emissiveColorHex: '#38bdf8',
        floatAmplitude: 0.05,
        rotationSpeed: 0.003,
        depthLayer: 'midground'
      },
      {
        id: 'glaci-pillar-right',
        shape: 'crystal-pillar',
        position: { x: 1.75, y: 0.25, z: 1.6 },
        scale: { x: 0.4, y: 1.4, z: 0.4 },
        primaryColorHex: '#38bdf8',
        emissiveColorHex: '#bae6fd',
        floatAmplitude: 0.06,
        rotationSpeed: -0.003,
        depthLayer: 'midground'
      },
      {
        id: 'glaci-spire-fore-left',
        shape: 'crystal-pillar',
        position: { x: -2.1, y: -0.72, z: -0.35 },
        scale: { x: 0.3, y: 0.6, z: 0.3 },
        primaryColorHex: '#0369a1',
        emissiveColorHex: '#7dd3fc',
        floatAmplitude: 0.02,
        rotationSpeed: 0.002,
        depthLayer: 'foreground'
      },
      {
        id: 'glaci-shard-fore-right',
        shape: 'crystal-pillar',
        position: { x: 2.1, y: -0.72, z: -0.35 },
        scale: { x: 0.3, y: 0.55, z: 0.3 },
        primaryColorHex: '#38bdf8',
        emissiveColorHex: '#e0f2fe',
        floatAmplitude: 0.02,
        rotationSpeed: -0.002,
        depthLayer: 'foreground'
      }
    ]
  },
  electrossauro: {
    id: 'storm-spire-crag',
    characterId: 'electrossauro',
    name: 'Pico dos Para-Raios de Basalto',
    description: 'Platô magnético elevado com bobinas naturais de cristal, agulhas de tempestade e arcos voltaicos.',
    element: 'electric',
    lighting: {
      clearColorHex: '#030712',
      ambientColorHex: '#1e293b',
      groundColorHex: '#0f172a',
      mainLightColorHex: '#fde047',
      mainLightIntensity: 1.3,
      rimLightColorHex: '#06b6d4',
      rimLightIntensity: 0.9,
      fogColorHex: '#0f172a',
      fogDensity: 0.03,
      pointLightColorHex: '#fde047',
      pointLightIntensity: 0.95,
      pointLightPosition: { x: -1.7, y: 0.4, z: 1.4 }
    },
    pedestalColorHex: '#1e293b',
    pedestalAccentHex: '#06b6d4',
    groundColorHex: '#090d16',
    backdrop: {
      skyTopColorHex: '#030712',
      skyBottomColorHex: '#1e1b4b',
      horizonColorHex: '#06b6d4',
      mountainColorHex: '#0f172a',
      mountainHighlightHex: '#fde047',
      celestialKind: 'clouds',
      celestialColorHex: '#22d3ee'
    },
    props: [
      {
        id: 'electro-coil-left',
        shape: 'floating-ring',
        position: { x: -1.7, y: 0.6, z: 1.45 },
        scale: { x: 0.55, y: 1.2, z: 0.55 },
        primaryColorHex: '#ca8a04',
        emissiveColorHex: '#22d3ee',
        floatAmplitude: 0.12,
        rotationSpeed: 0.015,
        depthLayer: 'midground'
      },
      {
        id: 'electro-coil-right',
        shape: 'floating-ring',
        position: { x: 1.7, y: 0.5, z: 1.45 },
        scale: { x: 0.55, y: 1.2, z: 0.55 },
        primaryColorHex: '#06b6d4',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.12,
        rotationSpeed: -0.015,
        depthLayer: 'midground'
      },
      {
        id: 'electro-spark-fore-left',
        shape: 'monolith',
        position: { x: -2.1, y: -0.7, z: -0.3 },
        scale: { x: 0.35, y: 0.55, z: 0.35 },
        primaryColorHex: '#0f172a',
        emissiveColorHex: '#06b6d4',
        floatAmplitude: 0.02,
        rotationSpeed: 0.003,
        depthLayer: 'foreground'
      },
      {
        id: 'electro-crystal-fore-right',
        shape: 'crystal-pillar',
        position: { x: 2.1, y: -0.7, z: -0.3 },
        scale: { x: 0.35, y: 0.55, z: 0.35 },
        primaryColorHex: '#ca8a04',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.02,
        rotationSpeed: -0.003,
        depthLayer: 'foreground'
      }
    ]
  },
  toxissauro: {
    id: 'bioluminescent-bog',
    characterId: 'toxissauro',
    name: 'Pântano Bioluminescente de Turfa',
    description: 'Charco místico de fungos gigantes bioluminescentes, cipós esmeralda e névoas verde-limão.',
    element: 'poison',
    lighting: {
      clearColorHex: '#090514',
      ambientColorHex: '#3b0764',
      groundColorHex: '#14532d',
      mainLightColorHex: '#a3e635',
      mainLightIntensity: 1.15,
      rimLightColorHex: '#a855f7',
      rimLightIntensity: 0.85,
      fogColorHex: '#1e0b36',
      fogDensity: 0.04,
      pointLightColorHex: '#a3e635',
      pointLightIntensity: 0.9,
      pointLightPosition: { x: -1.7, y: 0.1, z: 1.5 }
    },
    pedestalColorHex: '#4c1d95',
    pedestalAccentHex: '#84cc16',
    groundColorHex: '#1a0933',
    backdrop: {
      skyTopColorHex: '#090514',
      skyBottomColorHex: '#3b0764',
      horizonColorHex: '#65a30d',
      mountainColorHex: '#14532d',
      mountainHighlightHex: '#a3e635',
      celestialKind: 'nebula',
      celestialColorHex: '#a855f7'
    },
    props: [
      {
        id: 'toxi-shroom-left',
        shape: 'mushroom',
        position: { x: -1.7, y: 0.15, z: 1.5 },
        scale: { x: 0.6, y: 1.3, z: 0.6 },
        primaryColorHex: '#7e22ce',
        emissiveColorHex: '#84cc16',
        floatAmplitude: 0.04,
        rotationSpeed: 0.002,
        depthLayer: 'midground'
      },
      {
        id: 'toxi-shroom-right',
        shape: 'mushroom',
        position: { x: 1.7, y: 0.05, z: 1.5 },
        scale: { x: 0.5, y: 1.1, z: 0.5 },
        primaryColorHex: '#22c55e',
        emissiveColorHex: '#a855f7',
        floatAmplitude: 0.05,
        rotationSpeed: -0.002,
        depthLayer: 'midground'
      },
      {
        id: 'toxi-spore-fore-left',
        shape: 'mushroom',
        position: { x: -2.05, y: -0.75, z: -0.3 },
        scale: { x: 0.35, y: 0.5, z: 0.35 },
        primaryColorHex: '#581c87',
        emissiveColorHex: '#84cc16',
        floatAmplitude: 0.02,
        rotationSpeed: 0.001,
        depthLayer: 'foreground'
      },
      {
        id: 'toxi-fungus-fore-right',
        shape: 'mushroom',
        position: { x: 2.05, y: -0.75, z: -0.3 },
        scale: { x: 0.35, y: 0.5, z: 0.35 },
        primaryColorHex: '#166534',
        emissiveColorHex: '#a855f7',
        floatAmplitude: 0.02,
        rotationSpeed: -0.001,
        depthLayer: 'foreground'
      }
    ]
  },
  terrassauro: {
    id: 'emerald-cavern-monolith',
    characterId: 'terrassauro',
    name: 'Cânion Monolítico de Esmeralda',
    description: 'Cânion tectônico cravejado de drusas de esmeralda bruta, veios minerais e monólitos megalíticos.',
    element: 'earth',
    lighting: {
      clearColorHex: '#1c1917',
      ambientColorHex: '#292524',
      groundColorHex: '#1c1917',
      mainLightColorHex: '#f59e0b',
      mainLightIntensity: 1.2,
      rimLightColorHex: '#10b981',
      rimLightIntensity: 0.8,
      fogColorHex: '#1c1917',
      fogDensity: 0.028,
      pointLightColorHex: '#10b981',
      pointLightIntensity: 0.85,
      pointLightPosition: { x: 1.75, y: 0.15, z: 1.5 }
    },
    pedestalColorHex: '#44403c',
    pedestalAccentHex: '#10b981',
    groundColorHex: '#1c1917',
    backdrop: {
      skyTopColorHex: '#1c1917',
      skyBottomColorHex: '#44403c',
      horizonColorHex: '#059669',
      mountainColorHex: '#292524',
      mountainHighlightHex: '#10b981',
      celestialKind: 'moon',
      celestialColorHex: '#f59e0b'
    },
    props: [
      {
        id: 'terra-monolith-left',
        shape: 'monolith',
        position: { x: -1.8, y: 0.4, z: 1.6 },
        scale: { x: 0.65, y: 1.7, z: 0.65 },
        primaryColorHex: '#57534e',
        emissiveColorHex: '#10b981',
        floatAmplitude: 0.02,
        rotationSpeed: 0.001,
        depthLayer: 'midground'
      },
      {
        id: 'terra-emerald-right',
        shape: 'crystal-pillar',
        position: { x: 1.75, y: 0.3, z: 1.5 },
        scale: { x: 0.5, y: 1.5, z: 0.5 },
        primaryColorHex: '#059669',
        emissiveColorHex: '#34d399',
        floatAmplitude: 0.04,
        rotationSpeed: 0.003,
        depthLayer: 'midground'
      },
      {
        id: 'terra-geode-fore-left',
        shape: 'crystal-pillar',
        position: { x: -2.1, y: -0.72, z: -0.35 },
        scale: { x: 0.35, y: 0.55, z: 0.35 },
        primaryColorHex: '#047857',
        emissiveColorHex: '#10b981',
        floatAmplitude: 0.015,
        rotationSpeed: 0.001,
        depthLayer: 'foreground'
      },
      {
        id: 'terra-strata-fore-right',
        shape: 'monolith',
        position: { x: 2.1, y: -0.72, z: -0.35 },
        scale: { x: 0.35, y: 0.55, z: 0.35 },
        primaryColorHex: '#44403c',
        emissiveColorHex: '#f59e0b',
        floatAmplitude: 0.015,
        rotationSpeed: -0.001,
        depthLayer: 'foreground'
      }
    ]
  },
  aerossauro: {
    id: 'floating-sky-sanctuary',
    characterId: 'aerossauro',
    name: 'Altar Flutuante dos Ventos',
    description: 'Ilha celeste suspensa entre nuvens de zéfiro, anéis eólicos de mármore e plumas etéreas.',
    element: 'air',
    lighting: {
      clearColorHex: '#083344',
      ambientColorHex: '#0f766e',
      groundColorHex: '#115e59',
      mainLightColorHex: '#e0f2fe',
      mainLightIntensity: 1.3,
      rimLightColorHex: '#2dd4bf',
      rimLightIntensity: 0.85,
      fogColorHex: '#083344',
      fogDensity: 0.025,
      pointLightColorHex: '#2dd4bf',
      pointLightIntensity: 0.85,
      pointLightPosition: { x: 0, y: 1.2, z: 1.4 }
    },
    pedestalColorHex: '#0d9488',
    pedestalAccentHex: '#fde047',
    groundColorHex: '#042f2e',
    backdrop: {
      skyTopColorHex: '#083344',
      skyBottomColorHex: '#0e7490',
      horizonColorHex: '#fef08a',
      mountainColorHex: '#042f2e',
      mountainHighlightHex: '#e0f2fe',
      celestialKind: 'sun',
      celestialColorHex: '#fef08a'
    },
    props: [
      {
        id: 'aero-ring-left',
        shape: 'floating-ring',
        position: { x: -1.7, y: 0.75, z: 1.5 },
        scale: { x: 0.5, y: 1.1, z: 0.5 },
        primaryColorHex: '#f8fafc',
        emissiveColorHex: '#38bdf8',
        floatAmplitude: 0.16,
        rotationSpeed: 0.012,
        depthLayer: 'midground'
      },
      {
        id: 'aero-ring-right',
        shape: 'floating-ring',
        position: { x: 1.7, y: 0.8, z: 1.5 },
        scale: { x: 0.5, y: 1.1, z: 0.5 },
        primaryColorHex: '#2dd4bf',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.18,
        rotationSpeed: -0.012,
        depthLayer: 'midground'
      },
      {
        id: 'aero-cloud-fore-left',
        shape: 'floating-ring',
        position: { x: -2.1, y: -0.65, z: -0.3 },
        scale: { x: 0.35, y: 0.45, z: 0.35 },
        primaryColorHex: '#e0f2fe',
        emissiveColorHex: '#38bdf8',
        floatAmplitude: 0.06,
        rotationSpeed: 0.005,
        depthLayer: 'foreground'
      },
      {
        id: 'aero-feather-fore-right',
        shape: 'floating-ring',
        position: { x: 2.1, y: -0.65, z: -0.3 },
        scale: { x: 0.35, y: 0.45, z: 0.35 },
        primaryColorHex: '#2dd4bf',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.06,
        rotationSpeed: -0.005,
        depthLayer: 'foreground'
      }
    ]
  },
  umbrassauro: {
    id: 'umbral-obsidian-crypt',
    characterId: 'umbrassauro',
    name: 'Vale de Obsidiana e Luar Carmesim',
    description: 'Santuário noturno de obsidiana polida sob eclipse total, chamas espirituais carmesim e runas sombrias.',
    element: 'shadow',
    lighting: {
      clearColorHex: '#020204',
      ambientColorHex: '#18181b',
      groundColorHex: '#09090b',
      mainLightColorHex: '#f43f5e',
      mainLightIntensity: 1.15,
      rimLightColorHex: '#d6d3d1',
      rimLightIntensity: 0.75,
      fogColorHex: '#09090b',
      fogDensity: 0.042,
      pointLightColorHex: '#f43f5e',
      pointLightIntensity: 0.9,
      pointLightPosition: { x: -1.75, y: 0.3, z: 1.55 }
    },
    pedestalColorHex: '#27272a',
    pedestalAccentHex: '#e11d48',
    groundColorHex: '#09090b',
    backdrop: {
      skyTopColorHex: '#020204',
      skyBottomColorHex: '#18181b',
      horizonColorHex: '#e11d48',
      mountainColorHex: '#09090b',
      mountainHighlightHex: '#f43f5e',
      celestialKind: 'eclipse',
      celestialColorHex: '#f43f5e'
    },
    props: [
      {
        id: 'umbra-arch-left',
        shape: 'obsidian-arch',
        position: { x: -1.75, y: 0.45, z: 1.55 },
        scale: { x: 0.45, y: 1.75, z: 0.45 },
        primaryColorHex: '#18181b',
        emissiveColorHex: '#e11d48',
        floatAmplitude: 0.05,
        rotationSpeed: 0.004,
        depthLayer: 'midground'
      },
      {
        id: 'umbra-arch-right',
        shape: 'obsidian-arch',
        position: { x: 1.75, y: 0.45, z: 1.55 },
        scale: { x: 0.45, y: 1.75, z: 0.45 },
        primaryColorHex: '#27272a',
        emissiveColorHex: '#f43f5e',
        floatAmplitude: 0.05,
        rotationSpeed: -0.004,
        depthLayer: 'midground'
      },
      {
        id: 'umbra-shard-fore-left',
        shape: 'monolith',
        position: { x: -2.1, y: -0.72, z: -0.35 },
        scale: { x: 0.3, y: 0.55, z: 0.3 },
        primaryColorHex: '#18181b',
        emissiveColorHex: '#e11d48',
        floatAmplitude: 0.02,
        rotationSpeed: 0.002,
        depthLayer: 'foreground'
      },
      {
        id: 'umbra-flame-fore-right',
        shape: 'monolith',
        position: { x: 2.1, y: -0.72, z: -0.35 },
        scale: { x: 0.3, y: 0.55, z: 0.3 },
        primaryColorHex: '#27272a',
        emissiveColorHex: '#f43f5e',
        floatAmplitude: 0.02,
        rotationSpeed: -0.002,
        depthLayer: 'foreground'
      }
    ]
  },
  solassauro: {
    id: 'helios-golden-citadel',
    characterId: 'solassauro',
    name: 'Templo Solar da Aurora Dourada',
    description: 'Cidadela sagrada de mármore branco-platina, obeliscos solares com esferas douradas e raios da aurora.',
    element: 'light',
    lighting: {
      clearColorHex: '#1c1917',
      ambientColorHex: '#78350f',
      groundColorHex: '#451a03',
      mainLightColorHex: '#fde047',
      mainLightIntensity: 1.35,
      rimLightColorHex: '#38bdf8',
      rimLightIntensity: 0.85,
      fogColorHex: '#291704',
      fogDensity: 0.022,
      pointLightColorHex: '#fde047',
      pointLightIntensity: 1.0,
      pointLightPosition: { x: 0, y: 1.0, z: 1.2 }
    },
    pedestalColorHex: '#f59e0b',
    pedestalAccentHex: '#fef08a',
    groundColorHex: '#291504',
    backdrop: {
      skyTopColorHex: '#1c1917',
      skyBottomColorHex: '#78350f',
      horizonColorHex: '#fde047',
      mountainColorHex: '#451a03',
      mountainHighlightHex: '#fef08a',
      celestialKind: 'sun',
      celestialColorHex: '#fde047'
    },
    props: [
      {
        id: 'sola-obelisk-left',
        shape: 'solar-obelisk',
        position: { x: -1.8, y: 0.5, z: 1.5 },
        scale: { x: 0.45, y: 1.8, z: 0.45 },
        primaryColorHex: '#f8fafc',
        emissiveColorHex: '#f59e0b',
        floatAmplitude: 0.08,
        rotationSpeed: 0.006,
        depthLayer: 'midground'
      },
      {
        id: 'sola-obelisk-right',
        shape: 'solar-obelisk',
        position: { x: 1.8, y: 0.5, z: 1.5 },
        scale: { x: 0.45, y: 1.8, z: 0.45 },
        primaryColorHex: '#f59e0b',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.08,
        rotationSpeed: -0.006,
        depthLayer: 'midground'
      },
      {
        id: 'sola-plinth-fore-left',
        shape: 'solar-obelisk',
        position: { x: -2.1, y: -0.7, z: -0.3 },
        scale: { x: 0.35, y: 0.55, z: 0.35 },
        primaryColorHex: '#fef08a',
        emissiveColorHex: '#f59e0b',
        floatAmplitude: 0.03,
        rotationSpeed: 0.003,
        depthLayer: 'foreground'
      },
      {
        id: 'sola-flame-fore-right',
        shape: 'solar-obelisk',
        position: { x: 2.1, y: -0.7, z: -0.3 },
        scale: { x: 0.35, y: 0.55, z: 0.35 },
        primaryColorHex: '#f59e0b',
        emissiveColorHex: '#fde047',
        floatAmplitude: 0.03,
        rotationSpeed: -0.003,
        depthLayer: 'foreground'
      }
    ]
  }
};

export function getCharacterEnvironmentConfig(
  characterId: CharacterId
): CharacterEnvironmentConfig {
  return ENVIRONMENT_REGISTRY[characterId];
}
