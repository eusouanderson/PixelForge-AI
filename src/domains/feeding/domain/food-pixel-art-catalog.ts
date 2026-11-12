import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

export const FOOD_PIXEL_ARTS: Readonly<Record<string, DeclarativePixelArt>> = {
  'volcanic-roast-meat': {
    version: '1.0.0',
    name: 'Pernil Vulcânico Assado',
    description: 'Carne pré-histórica assada com osso crocante e brasas geotérmicas.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      bone_knob: '#94a3b8',
      bone_shade: '#cbd5e1',
      bone: '#f8fafc',
      meat_char: '#431407',
      meat_dark: '#7c2d12',
      meat_mid: '#c2410c',
      meat_light: '#ea580c',
      glaze: '#f97316',
      ember: '#fbbf24'
    },
    layers: [
      {
        id: 'meat_base',
        name: 'Pernil e Osso',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Osso projetado na diagonal inferior esquerda
          { type: 'rect', x: 1, y: 12, width: 2, height: 3, color: 'bone_knob' },
          { type: 'pixel', x: 2, y: 11, color: 'bone_knob' },
          { type: 'pixel', x: 0, y: 13, color: 'bone_knob' },
          { type: 'pixel', x: 1, y: 13, color: 'bone' },
          { type: 'pixel', x: 2, y: 12, color: 'bone' },
          { type: 'line', x0: 2, y0: 11, x1: 5, y1: 8, color: 'bone_shade' },
          { type: 'line', x0: 3, y0: 10, x1: 6, y1: 7, color: 'bone' },

          // Contorno / crosta tostada do pernil
          { type: 'rect', x: 5, y: 3, width: 8, height: 8, color: 'meat_char' },
          { type: 'rect', x: 6, y: 2, width: 6, height: 10, color: 'meat_char' },
          { type: 'rect', x: 7, y: 1, width: 4, height: 12, color: 'meat_char' },

          // Carne escura assada
          { type: 'rect', x: 6, y: 3, width: 6, height: 8, color: 'meat_dark' },
          { type: 'rect', x: 7, y: 2, width: 4, height: 10, color: 'meat_dark' },

          // Miolo suculento e dourado
          { type: 'rect', x: 7, y: 4, width: 4, height: 6, color: 'meat_mid' },
          { type: 'rect', x: 8, y: 3, width: 3, height: 6, color: 'meat_light' },

          // Marcas de grelha tostadas
          { type: 'line', x0: 6, y0: 5, x1: 11, y1: 5, color: 'meat_char' },
          { type: 'line', x0: 7, y0: 8, x1: 11, y1: 8, color: 'meat_char' },

          // Brilho do glacê geotérmico
          { type: 'pixel', x: 9, y: 3, color: 'glaze' },
          { type: 'pixel', x: 8, y: 4, color: 'glaze' },
          { type: 'pixel', x: 9, y: 4, color: 'ember' },
          { type: 'pixel', x: 10, y: 6, color: 'glaze' },

          // Fagulhas e brasas flutuantes
          { type: 'pixel', x: 14, y: 1, color: 'ember' },
          { type: 'pixel', x: 12, y: 0, color: 'glaze' },
          { type: 'pixel', x: 15, y: 4, color: 'ember' }
        ]
      }
    ]
  },

  'frosted-crystal-berry': {
    version: '1.0.0',
    name: 'Fruta-Cristal da Tundra',
    description: 'Cluster de bagas polares translúcidas com espículas de gelo brilhantes.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      ice_shadow: '#1e3a8a',
      ice_deep: '#0369a1',
      berry_body: '#0ea5e9',
      berry_light: '#38bdf8',
      frost_facet: '#7dd3fc',
      sparkle: '#ffffff',
      stem: '#bae6fd'
    },
    layers: [
      {
        id: 'berry_base',
        name: 'Bagas Congeladas',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Raminho e cristais de haste
          { type: 'pixel', x: 8, y: 1, color: 'stem' },
          { type: 'pixel', x: 7, y: 2, color: 'stem' },
          { type: 'pixel', x: 8, y: 3, color: 'frost_facet' },

          // Baga Superior (Centro)
          { type: 'rect', x: 6, y: 3, width: 4, height: 4, color: 'ice_shadow' },
          { type: 'rect', x: 6, y: 4, width: 3, height: 3, color: 'berry_body' },
          { type: 'pixel', x: 7, y: 4, color: 'berry_light' },
          { type: 'pixel', x: 7, y: 3, color: 'sparkle' },

          // Baga Inferior Esquerda
          { type: 'rect', x: 2, y: 7, width: 6, height: 6, color: 'ice_shadow' },
          { type: 'rect', x: 3, y: 8, width: 4, height: 4, color: 'berry_body' },
          { type: 'rect', x: 3, y: 8, width: 2, height: 2, color: 'berry_light' },
          { type: 'pixel', x: 4, y: 8, color: 'sparkle' },
          { type: 'pixel', x: 5, y: 10, color: 'frost_facet' },

          // Baga Inferior Direita
          { type: 'rect', x: 8, y: 7, width: 6, height: 6, color: 'ice_shadow' },
          { type: 'rect', x: 9, y: 8, width: 4, height: 4, color: 'berry_body' },
          { type: 'rect', x: 10, y: 8, width: 2, height: 2, color: 'berry_light' },
          { type: 'pixel', x: 11, y: 8, color: 'sparkle' },
          { type: 'pixel', x: 10, y: 11, color: 'ice_deep' },

          // Cristais e geada saliente
          { type: 'pixel', x: 1, y: 9, color: 'frost_facet' },
          { type: 'pixel', x: 14, y: 9, color: 'frost_facet' },
          { type: 'pixel', x: 7, y: 13, color: 'frost_facet' },
          { type: 'pixel', x: 8, y: 14, color: 'sparkle' },
          { type: 'pixel', x: 13, y: 4, color: 'sparkle' }
        ]
      }
    ]
  },

  'plasma-thunder-fruit': {
    version: '1.0.0',
    name: 'Fruta-Trovão de Plasma',
    description: 'Fruto bioelétrico losangular com descargas de plasma e centelhas.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      outline: '#1e1b4b',
      amber_shade: '#ca8a04',
      electric_yellow: '#eab308',
      plasma_bright: '#fde047',
      lightning_core: '#fef08a',
      plasma_cyan: '#06b6d4',
      spark_cyan: '#67e8f9',
      white_sparkle: '#ffffff'
    },
    layers: [
      {
        id: 'plasma_fruit',
        name: 'Fruto Losangular',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Losango base com contorno
          { type: 'line', x0: 7, y0: 2, x1: 2, y1: 7, color: 'outline' },
          { type: 'line', x0: 2, y0: 7, x1: 7, y1: 12, color: 'outline' },
          { type: 'line', x0: 8, y0: 12, x1: 13, y1: 7, color: 'outline' },
          { type: 'line', x0: 13, y0: 7, x1: 8, y1: 2, color: 'outline' },

          // Preenchimento dourado bioelétrico
          { type: 'rect', x: 5, y: 4, width: 6, height: 7, color: 'electric_yellow' },
          { type: 'rect', x: 4, y: 5, width: 8, height: 5, color: 'electric_yellow' },
          { type: 'rect', x: 3, y: 6, width: 10, height: 3, color: 'amber_shade' },

          // Núcleo luminoso reluzente
          { type: 'rect', x: 6, y: 5, width: 4, height: 4, color: 'plasma_bright' },
          { type: 'pixel', x: 7, y: 6, color: 'lightning_core' },
          { type: 'pixel', x: 8, y: 6, color: 'white_sparkle' },
          { type: 'pixel', x: 7, y: 7, color: 'white_sparkle' },

          // Raios de plasma elétrico saindo dos vértices
          { type: 'pixel', x: 7, y: 1, color: 'spark_cyan' },
          { type: 'pixel', x: 8, y: 0, color: 'plasma_cyan' },
          { type: 'pixel', x: 1, y: 7, color: 'spark_cyan' },
          { type: 'pixel', x: 0, y: 6, color: 'plasma_cyan' },
          { type: 'pixel', x: 14, y: 7, color: 'spark_cyan' },
          { type: 'pixel', x: 15, y: 8, color: 'plasma_cyan' },
          { type: 'pixel', x: 7, y: 13, color: 'spark_cyan' },
          { type: 'pixel', x: 8, y: 14, color: 'white_sparkle' }
        ]
      }
    ]
  },

  'glowing-swamp-mushroom': {
    version: '1.0.0',
    name: 'Cogumelo Bioluminescente',
    description: 'Fungo abissal violeta com pintas verde-limão incandescentes.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      cap_shadow: '#3b0764',
      cap_mid: '#6b21a8',
      cap_light: '#9333ea',
      cap_bright: '#a855f7',
      spot_dark: '#4d7c0f',
      spot_bright: '#a3e635',
      spot_glow: '#d9f99d',
      stalk_shadow: '#6b21a8',
      stalk_mid: '#e9d5ff',
      stalk_light: '#ffffff'
    },
    layers: [
      {
        id: 'mushroom',
        name: 'Cogumelo',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Caule luminoso
          { type: 'rect', x: 6, y: 8, width: 4, height: 6, color: 'stalk_shadow' },
          { type: 'rect', x: 7, y: 8, width: 2, height: 6, color: 'stalk_mid' },
          { type: 'pixel', x: 7, y: 9, color: 'stalk_light' },
          { type: 'pixel', x: 7, y: 11, color: 'stalk_light' },
          { type: 'rect', x: 5, y: 13, width: 6, height: 2, color: 'stalk_shadow' },

          // Chapéu arredondado do cogumelo
          { type: 'rect', x: 4, y: 2, width: 8, height: 7, color: 'cap_shadow' },
          { type: 'rect', x: 2, y: 4, width: 12, height: 5, color: 'cap_shadow' },
          { type: 'rect', x: 1, y: 6, width: 14, height: 3, color: 'cap_shadow' },

          // Preenchimento e gradiente do chapéu
          { type: 'rect', x: 3, y: 4, width: 10, height: 4, color: 'cap_mid' },
          { type: 'rect', x: 4, y: 3, width: 8, height: 4, color: 'cap_light' },
          { type: 'rect', x: 5, y: 2, width: 6, height: 2, color: 'cap_bright' },

          // Pintas bioluminescentes verde-limão
          { type: 'pixel', x: 3, y: 6, color: 'spot_bright' },
          { type: 'pixel', x: 5, y: 4, color: 'spot_bright' },
          { type: 'pixel', x: 5, y: 3, color: 'spot_glow' },
          { type: 'pixel', x: 9, y: 3, color: 'spot_bright' },
          { type: 'pixel', x: 10, y: 3, color: 'spot_glow' },
          { type: 'pixel', x: 12, y: 6, color: 'spot_bright' },
          { type: 'pixel', x: 7, y: 5, color: 'spot_bright' },
          { type: 'pixel', x: 8, y: 5, color: 'spot_glow' },
          { type: 'pixel', x: 7, y: 6, color: 'spot_dark' }
        ]
      }
    ]
  },

  'emerald-crystal-geode': {
    version: '1.0.0',
    name: 'Geodo Crocante de Esmeralda',
    description: 'Rocha partida repleta de prismas de esmeralda lapidados reluzentes.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      rock_dark: '#292524',
      rock_mid: '#57534e',
      rock_light: '#78716c',
      emerald_deep: '#064e3b',
      emerald_mid: '#059669',
      emerald_bright: '#10b981',
      emerald_light: '#34d399',
      crystal_sparkle: '#ffffff'
    },
    layers: [
      {
        id: 'geode',
        name: 'Geodo Mineral',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Casca rochosa externa
          { type: 'rect', x: 1, y: 3, width: 6, height: 10, color: 'rock_dark' },
          { type: 'rect', x: 2, y: 2, width: 11, height: 12, color: 'rock_dark' },
          { type: 'rect', x: 3, y: 3, width: 9, height: 10, color: 'rock_mid' },
          { type: 'pixel', x: 2, y: 5, color: 'rock_light' },
          { type: 'pixel', x: 2, y: 9, color: 'rock_light' },
          { type: 'pixel', x: 3, y: 2, color: 'rock_light' },

          // Cavidade interior com esmeraldas
          { type: 'rect', x: 5, y: 4, width: 7, height: 8, color: 'emerald_deep' },

          // Prismas de esmeralda projetando-se
          { type: 'line', x0: 6, y0: 8, x1: 9, y1: 5, color: 'emerald_mid' },
          { type: 'line', x0: 8, y0: 10, x1: 11, y1: 7, color: 'emerald_bright' },
          { type: 'line', x0: 6, y0: 6, x1: 10, y1: 6, color: 'emerald_light' },

          { type: 'rect', x: 7, y: 6, width: 3, height: 3, color: 'emerald_bright' },
          { type: 'rect', x: 8, y: 7, width: 2, height: 2, color: 'emerald_light' },

          // Brilhos e facetas polidas
          { type: 'pixel', x: 9, y: 5, color: 'crystal_sparkle' },
          { type: 'pixel', x: 11, y: 7, color: 'crystal_sparkle' },
          { type: 'pixel', x: 7, y: 10, color: 'emerald_light' },
          { type: 'pixel', x: 12, y: 4, color: 'crystal_sparkle' }
        ]
      }
    ]
  },

  'sky-winged-cloudberry': {
    version: '1.0.0',
    name: 'Fruta-Nuvem Alada de Zéfiro',
    description: 'Baga celeste fofa levitante ladeada por pequenas asas angelicais de brisa.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      outline: '#0369a1',
      berry_dark: '#0284c7',
      berry_mid: '#38bdf8',
      berry_light: '#7dd3fc',
      wing_shade: '#94a3b8',
      wing_mid: '#e0f2fe',
      wing_white: '#ffffff',
      sun_core: '#fef08a'
    },
    layers: [
      {
        id: 'cloudberry',
        name: 'Fruta Alada',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Asa Esquerda de Nuvem
          { type: 'pixel', x: 1, y: 4, color: 'wing_white' },
          { type: 'rect', x: 2, y: 4, width: 3, height: 2, color: 'wing_white' },
          { type: 'pixel', x: 2, y: 6, color: 'wing_mid' },
          { type: 'pixel', x: 3, y: 6, color: 'wing_shade' },

          // Asa Direita de Nuvem
          { type: 'pixel', x: 14, y: 4, color: 'wing_white' },
          { type: 'rect', x: 11, y: 4, width: 3, height: 2, color: 'wing_white' },
          { type: 'pixel', x: 13, y: 6, color: 'wing_mid' },
          { type: 'pixel', x: 12, y: 6, color: 'wing_shade' },

          // Corpo central da baga celeste
          { type: 'rect', x: 5, y: 5, width: 6, height: 6, color: 'outline' },
          { type: 'rect', x: 5, y: 6, width: 6, height: 5, color: 'berry_dark' },
          { type: 'rect', x: 6, y: 5, width: 4, height: 6, color: 'berry_mid' },
          { type: 'rect', x: 6, y: 6, width: 3, height: 3, color: 'berry_light' },

          // Núcleo solar áureo e brilho
          { type: 'pixel', x: 7, y: 7, color: 'sun_core' },
          { type: 'pixel', x: 8, y: 7, color: 'wing_white' },
          { type: 'pixel', x: 7, y: 8, color: 'wing_white' },

          // Partículas de brisa ao redor
          { type: 'pixel', x: 4, y: 2, color: 'wing_mid' },
          { type: 'pixel', x: 11, y: 2, color: 'wing_mid' },
          { type: 'pixel', x: 8, y: 12, color: 'wing_mid' }
        ]
      }
    ]
  },

  'crimson-shadow-soulfruit': {
    version: '1.0.0',
    name: 'Fruto Abissal de Rubi',
    description: 'Fruto de casca negra e etérea com fenda revelando polpa carmesim viva.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      void_black: '#09090b',
      peel_dark: '#18181b',
      peel_mid: '#27272a',
      ruby_deep: '#881337',
      ruby_mid: '#be123c',
      ruby_bright: '#f43f5e',
      ruby_glint: '#fda4af',
      aura_purple: '#a855f7'
    },
    layers: [
      {
        id: 'soulfruit',
        name: 'Fruto das Sombras',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Halo sombrio e halo etéreo
          { type: 'pixel', x: 5, y: 1, color: 'aura_purple' },
          { type: 'pixel', x: 9, y: 1, color: 'aura_purple' },
          { type: 'pixel', x: 2, y: 8, color: 'aura_purple' },
          { type: 'pixel', x: 13, y: 8, color: 'aura_purple' },

          // Casca negra de obsidiana
          { type: 'rect', x: 4, y: 3, width: 8, height: 9, color: 'void_black' },
          { type: 'rect', x: 3, y: 5, width: 10, height: 7, color: 'void_black' },
          { type: 'rect', x: 4, y: 4, width: 8, height: 8, color: 'peel_dark' },
          { type: 'pixel', x: 4, y: 5, color: 'peel_mid' },
          { type: 'pixel', x: 11, y: 5, color: 'peel_mid' },

          // Fenda mística carmesim no centro
          { type: 'line', x0: 7, y0: 4, x1: 7, y1: 11, color: 'ruby_deep' },
          { type: 'line', x0: 8, y0: 4, x1: 8, y1: 11, color: 'ruby_mid' },
          { type: 'rect', x: 7, y: 6, width: 2, height: 4, color: 'ruby_bright' },

          // Sementes de rubi reluzentes
          { type: 'pixel', x: 7, y: 7, color: 'ruby_glint' },
          { type: 'pixel', x: 8, y: 9, color: 'ruby_glint' },
          { type: 'pixel', x: 8, y: 13, color: 'aura_purple' }
        ]
      }
    ]
  },

  'golden-starburst-sunpeach': {
    version: '1.0.0',
    name: 'Pêssego Solar Dourado',
    description: 'Pêssego radiante envolvido por labaredas solares douradas e folha viva.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      stem_leaf: '#15803d',
      leaf_bright: '#4ade80',
      peach_shadow: '#c2410c',
      peach_mid: '#ea580c',
      peach_warm: '#f97316',
      corona_flare: '#facc15',
      sun_bright: '#fef08a',
      sparkle: '#ffffff'
    },
    layers: [
      {
        id: 'sunpeach',
        name: 'Pêssego Solar',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Caule e folha verde
          { type: 'line', x0: 7, y0: 1, x1: 7, y1: 3, color: 'stem_leaf' },
          { type: 'pixel', x: 8, y: 2, color: 'leaf_bright' },
          { type: 'pixel', x: 9, y: 1, color: 'leaf_bright' },
          { type: 'pixel', x: 9, y: 2, color: 'stem_leaf' },

          // Pontas da coroa solar (raios solares projetados)
          { type: 'pixel', x: 1, y: 8, color: 'corona_flare' },
          { type: 'pixel', x: 14, y: 8, color: 'corona_flare' },
          { type: 'pixel', x: 4, y: 13, color: 'corona_flare' },
          { type: 'pixel', x: 11, y: 13, color: 'corona_flare' },

          // Corpo redondo e aveludado do pêssego
          { type: 'rect', x: 3, y: 4, width: 10, height: 9, color: 'peach_shadow' },
          { type: 'rect', x: 4, y: 4, width: 8, height: 8, color: 'peach_mid' },
          { type: 'rect', x: 5, y: 5, width: 6, height: 6, color: 'peach_warm' },

          // Fenda sutil do pêssego e reflexo solar
          { type: 'line', x0: 7, y0: 4, x1: 7, y1: 7, color: 'peach_shadow' },
          { type: 'rect', x: 8, y: 5, width: 2, height: 3, color: 'corona_flare' },
          { type: 'pixel', x: 8, y: 6, color: 'sun_bright' },
          { type: 'pixel', x: 9, y: 5, color: 'sparkle' },
          { type: 'pixel', x: 5, y: 9, color: 'corona_flare' }
        ]
      }
    ]
  },

  'thermal-spring-water': {
    version: '1.0.0',
    name: 'Água Cristalina da Nascente',
    description: 'Frasco de vidro com rolha de cortiça contendo água pura borbulhante.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      cork_dark: '#78350f',
      cork_light: '#b45309',
      glass_rim: '#0f172a',
      water_deep: '#0284c7',
      water_mid: '#0ea5e9',
      water_aqua: '#38bdf8',
      bubble: '#e0f2fe',
      sparkle_shine: '#ffffff'
    },
    layers: [
      {
        id: 'water_flask',
        name: 'Frasco de Água Mineral',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Rolha de cortiça
          { type: 'rect', x: 7, y: 1, width: 2, height: 2, color: 'cork_dark' },
          { type: 'pixel', x: 7, y: 1, color: 'cork_light' },

          // Gargalo de vidro
          { type: 'rect', x: 6, y: 3, width: 4, height: 2, color: 'glass_rim' },
          { type: 'rect', x: 7, y: 3, width: 2, height: 2, color: 'bubble' },

          // Corpo do frasco de vidro arredondado
          { type: 'rect', x: 4, y: 5, width: 8, height: 9, color: 'glass_rim' },
          { type: 'rect', x: 3, y: 7, width: 10, height: 6, color: 'glass_rim' },

          // Água termal pura
          { type: 'rect', x: 4, y: 7, width: 8, height: 6, color: 'water_deep' },
          { type: 'rect', x: 4, y: 8, width: 7, height: 4, color: 'water_mid' },
          { type: 'rect', x: 5, y: 6, width: 6, height: 2, color: 'water_aqua' },

          // Bolhas de ar efervescentes
          { type: 'pixel', x: 6, y: 11, color: 'bubble' },
          { type: 'pixel', x: 9, y: 9, color: 'bubble' },
          { type: 'pixel', x: 7, y: 7, color: 'bubble' },

          // Reflexo de vidro vertical à esquerda
          { type: 'line', x0: 4, y0: 8, x1: 4, y1: 12, color: 'sparkle_shine' },
          { type: 'pixel', x: 5, y: 7, color: 'sparkle_shine' }
        ]
      }
    ]
  },

  'nutri-vital-serum': {
    version: '1.0.0',
    name: 'Soro Nutri-Vital Concentrado',
    description: 'Frasco medicinal âmbar com bulbo conta-gotas e cruz de cura contra desnutrição.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      bulb_dark: '#334155',
      bulb_mid: '#64748b',
      bulb_light: '#94a3b8',
      bottle_rim: '#431407',
      serum_dark: '#9a3412',
      serum_mid: '#ea580c',
      serum_light: '#f97316',
      cross_white: '#ffffff',
      shine: '#ffedd5'
    },
    layers: [
      {
        id: 'serum',
        name: 'Soro Nutricional',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Bulbo conta-gotas superior
          { type: 'rect', x: 7, y: 0, width: 2, height: 2, color: 'bulb_mid' },
          { type: 'pixel', x: 7, y: 0, color: 'bulb_light' },
          { type: 'rect', x: 6, y: 2, width: 4, height: 2, color: 'bulb_dark' },

          // Tampa e anel do frasco
          { type: 'rect', x: 5, y: 4, width: 6, height: 2, color: 'bottle_rim' },
          { type: 'rect', x: 6, y: 4, width: 4, height: 1, color: 'bulb_light' },

          // Corpo do frasco âmbar
          { type: 'rect', x: 4, y: 6, width: 8, height: 8, color: 'bottle_rim' },
          { type: 'rect', x: 5, y: 6, width: 6, height: 7, color: 'serum_dark' },
          { type: 'rect', x: 5, y: 7, width: 5, height: 5, color: 'serum_mid' },
          { type: 'line', x0: 5, y0: 7, x1: 5, y1: 11, color: 'serum_light' },

          // Cruz médica branca central
          { type: 'line', x0: 6, y0: 9, x1: 8, y1: 9, color: 'cross_white' },
          { type: 'line', x0: 7, y0: 8, x1: 7, y1: 10, color: 'cross_white' },

          // Reflexo de luz
          { type: 'pixel', x: 5, y: 6, color: 'shine' }
        ]
      }
    ]
  },

  'isotonic-hydra-elixir': {
    version: '1.0.0',
    name: 'Elixir Isotônico de Hidratação',
    description: 'Balão volumétrico azul ciano com tampa prateada e gota hidrante.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      cap_dark: '#1e293b',
      cap_silver: '#94a3b8',
      flask_rim: '#0c4a6e',
      fluid_dark: '#0369a1',
      fluid_mid: '#0ea5e9',
      fluid_light: '#38bdf8',
      drop_symbol: '#ffffff',
      shine: '#bae6fd'
    },
    layers: [
      {
        id: 'hydra_flask',
        name: 'Elixir Isotônico',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Tampa metálica selada
          { type: 'rect', x: 6, y: 1, width: 4, height: 2, color: 'cap_silver' },
          { type: 'rect', x: 7, y: 0, width: 2, height: 1, color: 'cap_dark' },

          // Gargalo estreito
          { type: 'rect', x: 7, y: 3, width: 2, height: 3, color: 'flask_rim' },
          { type: 'pixel', x: 7, y: 4, color: 'fluid_mid' },

          // Balão esférico
          { type: 'rect', x: 4, y: 6, width: 8, height: 8, color: 'flask_rim' },
          { type: 'rect', x: 3, y: 8, width: 10, height: 5, color: 'flask_rim' },

          // Fluido ciano eletrolítico
          { type: 'rect', x: 4, y: 8, width: 8, height: 5, color: 'fluid_dark' },
          { type: 'rect', x: 4, y: 9, width: 7, height: 3, color: 'fluid_mid' },
          { type: 'line', x0: 5, y0: 7, x1: 9, y1: 7, color: 'fluid_light' },

          // Símbolo de gota de água branca
          { type: 'pixel', x: 8, y: 9, color: 'drop_symbol' },
          { type: 'line', x0: 7, y0: 10, x1: 9, y1: 10, color: 'drop_symbol' },
          { type: 'pixel', x: 8, y: 11, color: 'drop_symbol' },

          // Reflexo curvo no vidro
          { type: 'pixel', x: 4, y: 7, color: 'shine' },
          { type: 'pixel', x: 3, y: 9, color: 'shine' }
        ]
      }
    ]
  },

  'enzymatic-digest-tonic': {
    version: '1.0.0',
    name: 'Tônico Digestivo Enzimático',
    description: 'Frasco herbal verde com rolha, extrato digestivo e folha de alívio gástrico.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      cork: '#78350f',
      bottle_rim: '#052e16',
      tonic_dark: '#14532d',
      tonic_mid: '#16a34a',
      tonic_light: '#4ade80',
      tonic_lime: '#86efac',
      leaf_symbol: '#ffffff',
      bubble: '#ecfccb'
    },
    layers: [
      {
        id: 'digest_tonic',
        name: 'Tônico Digestivo',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Rolha
          { type: 'rect', x: 7, y: 1, width: 2, height: 2, color: 'cork' },

          // Ombro do frasco
          { type: 'rect', x: 6, y: 3, width: 4, height: 2, color: 'bottle_rim' },

          // Corpo retangular de vidro escuro
          { type: 'rect', x: 4, y: 5, width: 8, height: 9, color: 'bottle_rim' },
          { type: 'rect', x: 5, y: 6, width: 6, height: 7, color: 'tonic_dark' },
          { type: 'rect', x: 5, y: 7, width: 5, height: 5, color: 'tonic_mid' },

          // Folha medicinal calmante
          { type: 'pixel', x: 6, y: 8, color: 'leaf_symbol' },
          { type: 'line', x0: 7, y0: 8, x1: 8, y1: 10, color: 'leaf_symbol' },
          { type: 'pixel', x: 7, y: 10, color: 'leaf_symbol' },

          // Microbolhas digestivas ativas
          { type: 'pixel', x: 6, y: 12, color: 'bubble' },
          { type: 'pixel', x: 9, y: 11, color: 'bubble' },
          { type: 'pixel', x: 8, y: 6, color: 'tonic_lime' },

          // Brilho na quina
          { type: 'line', x0: 4, y0: 6, x1: 4, y1: 12, color: 'tonic_light' }
        ]
      }
    ]
  },

  'antitoxin-charcoal-extract': {
    version: '1.0.0',
    name: 'Extrato Antitoxina de Carvão Vulcânico',
    description: 'Frasco hexagonal escuro com sedimento de carvão purificador de toxinas.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      cap_brass: '#ca8a04',
      bottle_dark: '#042f2e',
      charcoal_sediment: '#09090b',
      antitoxin_mid: '#0d9488',
      antitoxin_bright: '#14b8a6',
      antitoxin_glow: '#2dd4bf',
      cross_white: '#ffffff',
      shine: '#ccfbf1'
    },
    layers: [
      {
        id: 'antitoxin',
        name: 'Extrato Antitoxina',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Tampa de latão
          { type: 'rect', x: 7, y: 1, width: 2, height: 2, color: 'cap_brass' },
          { type: 'rect', x: 6, y: 3, width: 4, height: 1, color: 'cap_brass' },

          // Corpo hexagonal de boticário
          { type: 'rect', x: 4, y: 4, width: 8, height: 10, color: 'bottle_dark' },
          { type: 'rect', x: 3, y: 6, width: 10, height: 6, color: 'bottle_dark' },

          // Sedimento preto de carvão ativado no fundo
          { type: 'rect', x: 4, y: 11, width: 8, height: 2, color: 'charcoal_sediment' },
          { type: 'pixel', x: 5, y: 10, color: 'charcoal_sediment' },
          { type: 'pixel', x: 9, y: 10, color: 'charcoal_sediment' },

          // Líquido purificador verde-azulado
          { type: 'rect', x: 4, y: 5, width: 8, height: 5, color: 'antitoxin_mid' },
          { type: 'rect', x: 5, y: 6, width: 5, height: 4, color: 'antitoxin_bright' },

          // Cruz de desintoxicação
          { type: 'line', x0: 6, y0: 8, x1: 8, y1: 8, color: 'cross_white' },
          { type: 'line', x0: 7, y0: 7, x1: 7, y1: 9, color: 'cross_white' },

          // Partículas absorventes
          { type: 'pixel', x: 4, y: 6, color: 'shine' },
          { type: 'pixel', x: 10, y: 7, color: 'antitoxin_glow' }
        ]
      }
    ]
  },

  'antiseptic-spore-salve': {
    version: '1.0.0',
    name: 'Bálsamo Antisséptico Purificador',
    description: 'Lata metálica de pomada aberta com pasta medicinal verde-menta bactericida.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      tin_gold: '#ca8a04',
      tin_gold_bright: '#fde047',
      tin_shadow: '#134e4a',
      tin_body: '#0f766e',
      salve_dark: '#14b8a6',
      salve_mid: '#2dd4bf',
      salve_light: '#5eead4',
      cross_white: '#ffffff',
      shine: '#ccfbf1'
    },
    layers: [
      {
        id: 'salve',
        name: 'Pomada Antisséptica',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Borda dourada da tampa
          { type: 'rect', x: 3, y: 4, width: 10, height: 2, color: 'tin_gold' },
          { type: 'pixel', x: 4, y: 4, color: 'tin_gold_bright' },
          { type: 'pixel', x: 8, y: 4, color: 'tin_gold_bright' },

          // Pasta cremosa medicinal na abertura
          { type: 'rect', x: 4, y: 6, width: 8, height: 2, color: 'salve_dark' },
          { type: 'rect', x: 5, y: 6, width: 5, height: 2, color: 'salve_mid' },
          { type: 'pixel', x: 6, y: 6, color: 'salve_light' },
          { type: 'pixel', x: 7, y: 7, color: 'shine' },

          // Corpo redondo da lata de metal
          { type: 'rect', x: 2, y: 8, width: 12, height: 6, color: 'tin_shadow' },
          { type: 'rect', x: 3, y: 8, width: 10, height: 5, color: 'tin_body' },

          // Cruz antisséptica na frente da lata
          { type: 'line', x0: 6, y0: 10, x1: 8, y1: 10, color: 'cross_white' },
          { type: 'line', x0: 7, y0: 9, x1: 7, y1: 11, color: 'cross_white' },

          // Friso e base
          { type: 'line', x0: 3, y0: 13, x1: 11, y1: 13, color: 'tin_gold' },
          { type: 'pixel', x: 3, y: 9, color: 'shine' }
        ]
      }
    ]
  },

  'adrenal-stamina-ampoule': {
    version: '1.0.0',
    name: 'Ampola Revitalizante de Vigor',
    description: 'Ampola de vidro pontiaguda com fluido dourado bioenergético e raio de vigor.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      glass_tip: '#64748b',
      glass_outline: '#1e293b',
      adrenal_dark: '#854d0e',
      adrenal_mid: '#ca8a04',
      adrenal_bright: '#eab308',
      adrenal_gold: '#facc15',
      bolt_white: '#ffffff',
      shine: '#fef08a'
    },
    layers: [
      {
        id: 'ampoule',
        name: 'Ampola de Vigor',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Ponta selada da ampola
          { type: 'rect', x: 7, y: 0, width: 2, height: 2, color: 'glass_tip' },
          { type: 'rect', x: 7, y: 2, width: 2, height: 1, color: 'glass_outline' },

          // Corpo cilíndrico de vidro
          { type: 'rect', x: 5, y: 3, width: 6, height: 11, color: 'glass_outline' },
          { type: 'rect', x: 6, y: 4, width: 4, height: 9, color: 'adrenal_dark' },
          { type: 'rect', x: 6, y: 5, width: 3, height: 7, color: 'adrenal_mid' },
          { type: 'line', x0: 6, y0: 6, x1: 6, y1: 10, color: 'adrenal_bright' },

          // Raio branco de energia / eletrostamina
          { type: 'pixel', x: 8, y: 5, color: 'bolt_white' },
          { type: 'pixel', x: 7, y: 6, color: 'bolt_white' },
          { type: 'pixel', x: 8, y: 7, color: 'bolt_white' },
          { type: 'line', x0: 7, y0: 8, x1: 9, y1: 8, color: 'bolt_white' },
          { type: 'pixel', x: 7, y: 9, color: 'bolt_white' },
          { type: 'pixel', x: 8, y: 10, color: 'bolt_white' },

          // Fundo arredondado e brilho de vidro
          { type: 'rect', x: 6, y: 13, width: 4, height: 1, color: 'glass_outline' },
          { type: 'pixel', x: 5, y: 4, color: 'shine' },
          { type: 'pixel', x: 5, y: 11, color: 'adrenal_gold' }
        ]
      }
    ]
  },

  'serotonin-aura-nectar': {
    version: '1.0.0',
    name: 'Néctar Floral da Serenidade',
    description: 'Frasco gracioso com néctar floral rosa e coração radiante contra a melancolia.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      stopper_gold: '#f59e0b',
      bottle_rim: '#4a044e',
      nectar_dark: '#831843',
      nectar_mid: '#be185d',
      nectar_bright: '#ec4899',
      nectar_soft: '#f472b6',
      heart_white: '#ffffff',
      aura_sparkle: '#fbcfe8'
    },
    layers: [
      {
        id: 'serenity_nectar',
        name: 'Néctar da Serenidade',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Tampa dourada floral
          { type: 'rect', x: 7, y: 1, width: 2, height: 2, color: 'stopper_gold' },
          { type: 'pixel', x: 8, y: 0, color: 'aura_sparkle' },

          // Gargalo estreito
          { type: 'rect', x: 7, y: 3, width: 2, height: 2, color: 'bottle_rim' },

          // Frasco em formato de coração / gota
          { type: 'rect', x: 4, y: 5, width: 8, height: 7, color: 'bottle_rim' },
          { type: 'rect', x: 3, y: 6, width: 10, height: 5, color: 'bottle_rim' },
          { type: 'rect', x: 5, y: 12, width: 6, height: 2, color: 'bottle_rim' },
          { type: 'pixel', x: 7, y: 14, color: 'bottle_rim' },
          { type: 'pixel', x: 8, y: 14, color: 'bottle_rim' },

          // Néctar rosa reluzente
          { type: 'rect', x: 4, y: 6, width: 8, height: 5, color: 'nectar_dark' },
          { type: 'rect', x: 4, y: 7, width: 7, height: 4, color: 'nectar_mid' },
          { type: 'rect', x: 5, y: 6, width: 5, height: 3, color: 'nectar_bright' },

          // Pequeno coração branco central
          { type: 'pixel', x: 6, y: 8, color: 'heart_white' },
          { type: 'pixel', x: 8, y: 8, color: 'heart_white' },
          { type: 'line', x0: 6, y0: 9, x1: 8, y1: 9, color: 'heart_white' },
          { type: 'pixel', x: 7, y: 10, color: 'heart_white' },

          // Aura suave
          { type: 'pixel', x: 4, y: 5, color: 'aura_sparkle' },
          { type: 'pixel', x: 12, y: 4, color: 'aura_sparkle' },
          { type: 'pixel', x: 2, y: 10, color: 'nectar_soft' }
        ]
      }
    ]
  },

  'vitality-herbal-elixir': {
    version: '1.0.0',
    name: 'Elixir Herbal de Vitalidade (Panaceia)',
    description: 'Panaceia lendária em redoma dourada com essência esmeralda e estrela vital.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      gold_shadow: '#78350f',
      gold_mid: '#ca8a04',
      gold_bright: '#facc15',
      gold_light: '#fde047',
      bottle_rim: '#022c22',
      panacea_deep: '#064e3b',
      panacea_mid: '#059669',
      panacea_bright: '#10b981',
      panacea_light: '#34d399',
      star_white: '#ffffff',
      prismatic_glow: '#a7f3d0'
    },
    layers: [
      {
        id: 'panacea',
        name: 'Panaceia Ancestral',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Coroa de ouro e topo imperial
          { type: 'rect', x: 6, y: 1, width: 4, height: 2, color: 'gold_mid' },
          { type: 'pixel', x: 7, y: 0, color: 'gold_bright' },
          { type: 'pixel', x: 8, y: 0, color: 'gold_light' },
          { type: 'rect', x: 6, y: 3, width: 4, height: 1, color: 'gold_shadow' },

          // Frasco amplo de boticário lendário
          { type: 'rect', x: 3, y: 4, width: 10, height: 9, color: 'bottle_rim' },
          { type: 'rect', x: 2, y: 6, width: 12, height: 6, color: 'bottle_rim' },

          // Elixir esmeralda primordial
          { type: 'rect', x: 3, y: 6, width: 10, height: 6, color: 'panacea_deep' },
          { type: 'rect', x: 4, y: 6, width: 8, height: 5, color: 'panacea_mid' },
          { type: 'rect', x: 4, y: 7, width: 6, height: 3, color: 'panacea_bright' },

          // Pedestal de ouro na base
          { type: 'rect', x: 4, y: 13, width: 8, height: 2, color: 'gold_mid' },
          { type: 'pixel', x: 5, y: 13, color: 'gold_bright' },
          { type: 'pixel', x: 9, y: 13, color: 'gold_shadow' },

          // Estrela curativa de 4 pontas no centro
          { type: 'line', x0: 6, y0: 8, x1: 9, y1: 8, color: 'star_white' },
          { type: 'line', x0: 7, y0: 7, x1: 7, y1: 10, color: 'star_white' },
          { type: 'pixel', x: 8, y: 9, color: 'panacea_light' },

          // Brilhos prismáticos ao redor
          { type: 'pixel', x: 1, y: 4, color: 'prismatic_glow' },
          { type: 'pixel', x: 13, y: 3, color: 'gold_light' },
          { type: 'pixel', x: 13, y: 11, color: 'prismatic_glow' },
          { type: 'pixel', x: 3, y: 5, color: 'star_white' }
        ]
      }
    ]
  },

  'awakening-fruit': {
    version: '1.0.0',
    name: 'Fruta do Despertar',
    description: 'Fruto estelar radiante com espículas luminosas que despertam dinossauros do sono profundo.',
    logicalDimensions: { width: 16, height: 16 },
    palette: {
      transparent: '#00000000',
      stem: '#4d7c0f',
      leaf: '#84cc16',
      outer_glow: '#7c3aed',
      fruit_dark: '#9333ea',
      fruit_mid: '#c084fc',
      star_gold: '#f59e0b',
      star_bright: '#fbbf24',
      energy_spark: '#ffffff'
    },
    layers: [
      {
        id: 'awakening_fruit_base',
        name: 'Fruta do Despertar',
        visible: true,
        opacity: 1,
        zIndex: 1,
        operations: [
          // Caule e folhas superiores
          { type: 'pixel', x: 7, y: 1, color: 'stem' },
          { type: 'pixel', x: 8, y: 1, color: 'stem' },
          { type: 'pixel', x: 6, y: 2, color: 'leaf' },
          { type: 'pixel', x: 9, y: 2, color: 'leaf' },
          { type: 'pixel', x: 5, y: 3, color: 'leaf' },
          { type: 'pixel', x: 10, y: 3, color: 'leaf' },

          // Aura / casca mística exterior
          { type: 'rect', x: 5, y: 4, width: 6, height: 8, color: 'outer_glow' },
          { type: 'rect', x: 4, y: 5, width: 8, height: 6, color: 'outer_glow' },
          { type: 'rect', x: 3, y: 6, width: 10, height: 4, color: 'outer_glow' },

          // Pontas da estrela de despertar
          { type: 'pixel', x: 8, y: 3, color: 'star_bright' },
          { type: 'pixel', x: 8, y: 13, color: 'star_bright' },
          { type: 'pixel', x: 2, y: 8, color: 'star_bright' },
          { type: 'pixel', x: 13, y: 8, color: 'star_bright' },

          // Corpo central da fruta
          { type: 'rect', x: 5, y: 5, width: 6, height: 6, color: 'fruit_dark' },
          { type: 'rect', x: 6, y: 6, width: 4, height: 4, color: 'fruit_mid' },

          // Núcleo dourado estelar
          { type: 'rect', x: 7, y: 7, width: 2, height: 2, color: 'star_gold' },
          { type: 'pixel', x: 7, y: 7, color: 'star_bright' },
          { type: 'pixel', x: 8, y: 7, color: 'energy_spark' },

          // Centelhas de energia
          { type: 'pixel', x: 4, y: 4, color: 'energy_spark' },
          { type: 'pixel', x: 11, y: 4, color: 'energy_spark' },
          { type: 'pixel', x: 4, y: 11, color: 'star_bright' },
          { type: 'pixel', x: 11, y: 11, color: 'star_bright' }
        ]
      }
    ]
  }
};

export function getFoodPixelArt(foodId: string): DeclarativePixelArt {
  const art = FOOD_PIXEL_ARTS[foodId];
  if (!art) {
    throw new Error(`Pixel art não encontrada para o alimento/remédio: ${foodId}`);
  }
  return art;
}
