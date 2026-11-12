import type { AttributeKind } from '@/domains/attributes/types';
import type { CharacterLifeStage } from '@/domains/characters/types';
import type { BattleAttackDefinition, BattleParticipant } from '../types';

export const ATTACKS_CATALOG: readonly BattleAttackDefinition[] = [
  // --- Golpes Universais / Iniciais ---
  {
    id: 'golpe-instintivo',
    name: 'Golpe Instintivo',
    description: 'Um golpe reflexivo básico executado com energia pura.',
    element: 'earth',
    category: 'physical',
    compatibleSpecies: [
      'ignisauro',
      'glacissauro',
      'electrossauro',
      'toxissauro',
      'terrassauro',
      'aerossauro',
      'umbrassauro',
      'solassauro',
      'rosassauro',
      'cristalissauro',
      'astrassauro'
    ],
    minStage: 'baby',
    minLevel: 1,
    baseDamage: 12,
    staminaCost: 10,
    accuracyPercent: 95,
    criticalChancePercent: 5,
    speedTicks: 3,
    recoveryTicks: 2,
    attributeScaling: { strength: 0.6, agility: 0.4 },
    soundEffect: 'eat',
    animationName: 'comendo'
  },
  {
    id: 'investida-jovem',
    name: 'Investida Jovem',
    description: 'Avanço com todo o peso do corpo para empurrar o oponente.',
    element: 'earth',
    category: 'physical',
    compatibleSpecies: [
      'ignisauro',
      'glacissauro',
      'electrossauro',
      'toxissauro',
      'terrassauro',
      'aerossauro',
      'umbrassauro',
      'solassauro',
      'rosassauro',
      'cristalissauro',
      'astrassauro'
    ],
    minStage: 'crianca',
    minLevel: 3,
    requiredAttributes: { agility: 8 },
    baseDamage: 20,
    staminaCost: 16,
    accuracyPercent: 90,
    criticalChancePercent: 8,
    speedTicks: 4,
    recoveryTicks: 3,
    attributeScaling: { strength: 0.7, agility: 0.5 },
    soundEffect: 'burp',
    animationName: 'comendo'
  },

  // --- Fogo: Ignisauro ---
  {
    id: 'mordida-ignea',
    name: 'Mordida Ígnea',
    description: 'Mordida potente com dentes envoltos em chamas vivas.',
    element: 'fire',
    category: 'physical',
    compatibleSpecies: ['ignisauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { strength: 12 },
    baseDamage: 26,
    staminaCost: 18,
    accuracyPercent: 92,
    criticalChancePercent: 12,
    speedTicks: 3,
    recoveryTicks: 3,
    attributeScaling: { strength: 0.9, elementalAffinity: 0.4 },
    effectType: 'burn',
    effectChancePercent: 25,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'sopro-magmatico',
    name: 'Sopro Magmático',
    description: 'Erupção torrencial de magma superaquecido que consome o campo.',
    element: 'fire',
    category: 'special',
    compatibleSpecies: ['ignisauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 16, intelligence: 10 },
    baseDamage: 44,
    staminaCost: 32,
    accuracyPercent: 88,
    criticalChancePercent: 15,
    speedTicks: 5,
    recoveryTicks: 4,
    attributeScaling: { elementalAffinity: 1.2, intelligence: 0.6 },
    effectType: 'burn',
    effectChancePercent: 40,
    soundEffect: 'burp',
    animationName: 'amando'
  },

  // --- Gelo: Glacissauro ---
  {
    id: 'cauda-congelante',
    name: 'Cauda Congelante',
    description: 'Chicote de cauda revestido de espinhos glaciais afiados.',
    element: 'ice',
    category: 'physical',
    compatibleSpecies: ['glacissauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { defense: 10, agility: 8 },
    baseDamage: 24,
    staminaCost: 16,
    accuracyPercent: 94,
    criticalChancePercent: 10,
    speedTicks: 4,
    recoveryTicks: 3,
    attributeScaling: { defense: 0.8, strength: 0.5 },
    effectType: 'freeze',
    effectChancePercent: 20,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'nevasca-glacial',
    name: 'Nevasca Glacial',
    description: 'Rajada de zero absoluto que congela as articulações do adversário.',
    element: 'ice',
    category: 'special',
    compatibleSpecies: ['glacissauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 15, endurance: 12 },
    baseDamage: 40,
    staminaCost: 28,
    accuracyPercent: 90,
    criticalChancePercent: 12,
    speedTicks: 5,
    recoveryTicks: 4,
    attributeScaling: { elementalAffinity: 1.1, defense: 0.7 },
    effectType: 'freeze',
    effectChancePercent: 35,
    soundEffect: 'shower',
    animationName: 'amando'
  },

  // --- Elétrico: Electrossauro ---
  {
    id: 'investida-trovao',
    name: 'Investida Trovão',
    description: 'Avanço fulminante na velocidade de um relâmpago.',
    element: 'electric',
    category: 'physical',
    compatibleSpecies: ['electrossauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { agility: 14 },
    baseDamage: 25,
    staminaCost: 17,
    accuracyPercent: 96,
    criticalChancePercent: 18,
    speedTicks: 2,
    recoveryTicks: 2,
    attributeScaling: { agility: 1.1, strength: 0.4 },
    effectType: 'paralyze',
    effectChancePercent: 25,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'descarga-voltaica',
    name: 'Descarga Voltaica',
    description: 'Tempestade de raios concentrados gerada a partir das cristas dorsais.',
    element: 'electric',
    category: 'special',
    compatibleSpecies: ['electrossauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 16, agility: 15 },
    baseDamage: 42,
    staminaCost: 30,
    accuracyPercent: 90,
    criticalChancePercent: 20,
    speedTicks: 3,
    recoveryTicks: 4,
    attributeScaling: { elementalAffinity: 1.2, agility: 0.7 },
    effectType: 'paralyze',
    effectChancePercent: 40,
    soundEffect: 'burp',
    animationName: 'amando'
  },

  // --- Veneno: Toxissauro ---
  {
    id: 'presa-venenosa',
    name: 'Presa Venenosa',
    description: 'Mordida profunda inoculando toxinas corrosivas nas feridas.',
    element: 'poison',
    category: 'physical',
    compatibleSpecies: ['toxissauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { strength: 10, intelligence: 9 },
    baseDamage: 23,
    staminaCost: 15,
    accuracyPercent: 92,
    criticalChancePercent: 10,
    speedTicks: 4,
    recoveryTicks: 3,
    attributeScaling: { strength: 0.7, elementalAffinity: 0.6 },
    effectType: 'defense_down',
    effectChancePercent: 30,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'nuvem-miasmática',
    name: 'Nuvem Miasmática',
    description: 'Emanação densa de esporos cáusticos que asfixia o adversário.',
    element: 'poison',
    category: 'special',
    compatibleSpecies: ['toxissauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 15, endurance: 12 },
    baseDamage: 38,
    staminaCost: 26,
    accuracyPercent: 93,
    criticalChancePercent: 14,
    speedTicks: 4,
    recoveryTicks: 3,
    attributeScaling: { elementalAffinity: 1.1, endurance: 0.6 },
    effectType: 'defense_down',
    effectChancePercent: 50,
    soundEffect: 'sneezing',
    animationName: 'amando'
  },

  // --- Terra: Terrassauro ---
  {
    id: 'patada-sismica',
    name: 'Patada Sísmica',
    description: 'Pisada tectônica de alto impacto que racha o solo rochoso.',
    element: 'earth',
    category: 'physical',
    compatibleSpecies: ['terrassauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { strength: 14, endurance: 10 },
    baseDamage: 28,
    staminaCost: 20,
    accuracyPercent: 88,
    criticalChancePercent: 10,
    speedTicks: 5,
    recoveryTicks: 4,
    attributeScaling: { strength: 1.0, endurance: 0.6 },
    effectType: 'stun',
    effectChancePercent: 20,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'escudo-rochedo',
    name: 'Muralha Tectônica',
    description: 'Ergue placas de pedra maciça e contra-ataca com pedregulhos pontiagudos.',
    element: 'earth',
    category: 'special',
    compatibleSpecies: ['terrassauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { defense: 18, endurance: 14 },
    baseDamage: 36,
    staminaCost: 26,
    accuracyPercent: 92,
    criticalChancePercent: 8,
    speedTicks: 4,
    recoveryTicks: 3,
    attributeScaling: { defense: 1.3, strength: 0.6 },
    effectType: 'attack_buff',
    effectChancePercent: 30,
    soundEffect: 'burp',
    animationName: 'amando'
  },

  // --- Ar: Aerossauro ---
  {
    id: 'bicada-supersônica',
    name: 'Bicada Supersônica',
    description: 'Ataque perfurante em rasante de altíssima precisão.',
    element: 'air',
    category: 'physical',
    compatibleSpecies: ['aerossauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { agility: 15 },
    baseDamage: 24,
    staminaCost: 15,
    accuracyPercent: 98,
    criticalChancePercent: 22,
    speedTicks: 2,
    recoveryTicks: 2,
    attributeScaling: { agility: 1.2, intelligence: 0.4 },
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'turbilhao-cortante',
    name: 'Turbilhão Cortante',
    description: 'Vórtice aerodinâmico que projeta lâminas de vento condensado.',
    element: 'air',
    category: 'special',
    compatibleSpecies: ['aerossauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 16, agility: 16 },
    baseDamage: 40,
    staminaCost: 28,
    accuracyPercent: 91,
    criticalChancePercent: 18,
    speedTicks: 3,
    recoveryTicks: 3,
    attributeScaling: { elementalAffinity: 1.1, agility: 0.8 },
    effectType: 'defense_down',
    effectChancePercent: 35,
    soundEffect: 'shower',
    animationName: 'amando'
  },

  // --- Sombra: Umbrassauro ---
  {
    id: 'garras-sombrias',
    name: 'Garras Sombrias',
    description: 'Golpe furtivo a partir das sombras visando os pontos fracos.',
    element: 'shadow',
    category: 'physical',
    compatibleSpecies: ['umbrassauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { agility: 11, strength: 11 },
    baseDamage: 26,
    staminaCost: 17,
    accuracyPercent: 91,
    criticalChancePercent: 20,
    speedTicks: 3,
    recoveryTicks: 3,
    attributeScaling: { strength: 0.8, agility: 0.6 },
    effectType: 'stun',
    effectChancePercent: 22,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'abismo-crepuscular',
    name: 'Abismo Crepuscular',
    description: 'Distorção de matéria escura que drena a luz e a força do adversário.',
    element: 'shadow',
    category: 'special',
    compatibleSpecies: ['umbrassauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 17, intelligence: 13 },
    baseDamage: 43,
    staminaCost: 31,
    accuracyPercent: 89,
    criticalChancePercent: 16,
    speedTicks: 4,
    recoveryTicks: 4,
    attributeScaling: { elementalAffinity: 1.2, intelligence: 0.7 },
    effectType: 'defense_down',
    effectChancePercent: 40,
    soundEffect: 'dead',
    animationName: 'amando'
  },

  // --- Luz: Solassauro ---
  {
    id: 'chifre-radiante',
    name: 'Chifre Radiante',
    description: 'Investida frontal com o chifre emitindo brilho ofuscante.',
    element: 'light',
    category: 'physical',
    compatibleSpecies: ['solassauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { strength: 12, defense: 11 },
    baseDamage: 25,
    staminaCost: 17,
    accuracyPercent: 93,
    criticalChancePercent: 14,
    speedTicks: 3,
    recoveryTicks: 3,
    attributeScaling: { strength: 0.8, defense: 0.5 },
    effectType: 'stun',
    effectChancePercent: 25,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'clarão-solar',
    name: 'Clarão Solar',
    description: 'Facho concentrado de radiação luminosa que purifica o campo.',
    element: 'light',
    category: 'special',
    compatibleSpecies: ['solassauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 17, endurance: 13 },
    baseDamage: 43,
    staminaCost: 30,
    accuracyPercent: 90,
    criticalChancePercent: 16,
    speedTicks: 4,
    recoveryTicks: 4,
    attributeScaling: { elementalAffinity: 1.2, endurance: 0.6 },
    effectType: 'burn',
    effectChancePercent: 35,
    soundEffect: 'happy',
    animationName: 'amando'
  },

  // --- Fada: Rosassauro ---
  {
    id: 'petala-mistica',
    name: 'Pétala Mística',
    description: 'Chicote de espinhos florais imbuído com feromônios atordoantes.',
    element: 'fairy',
    category: 'physical',
    compatibleSpecies: ['rosassauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { agility: 10, intelligence: 12 },
    baseDamage: 23,
    staminaCost: 16,
    accuracyPercent: 95,
    criticalChancePercent: 12,
    speedTicks: 3,
    recoveryTicks: 3,
    attributeScaling: { agility: 0.7, intelligence: 0.7 },
    effectType: 'stun',
    effectChancePercent: 25,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'canto-encantado',
    name: 'Canto Encantado',
    description: 'Frequência melódica celestial que ressoa e desestabiliza o alvo.',
    element: 'fairy',
    category: 'special',
    compatibleSpecies: ['rosassauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 16, intelligence: 15 },
    baseDamage: 39,
    staminaCost: 27,
    accuracyPercent: 94,
    criticalChancePercent: 15,
    speedTicks: 4,
    recoveryTicks: 3,
    attributeScaling: { elementalAffinity: 1.1, intelligence: 0.8 },
    effectType: 'defense_down',
    effectChancePercent: 45,
    soundEffect: 'happy',
    animationName: 'amando'
  },

  // --- Cristal: Cristalissauro ---
  {
    id: 'fratura-cristalina',
    name: 'Fratura Cristalina',
    description: 'Golpe pesado com a cauda couraçada de geodos afiados.',
    element: 'crystal',
    category: 'physical',
    compatibleSpecies: ['cristalissauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { defense: 14, strength: 12 },
    baseDamage: 27,
    staminaCost: 19,
    accuracyPercent: 90,
    criticalChancePercent: 12,
    speedTicks: 4,
    recoveryTicks: 4,
    attributeScaling: { defense: 1.0, strength: 0.5 },
    effectType: 'stun',
    effectChancePercent: 20,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'prisma-prismático',
    name: 'Refração Prismática',
    description: 'Disparo de feixes policromáticos através das facetas de quartzo.',
    element: 'crystal',
    category: 'special',
    compatibleSpecies: ['cristalissauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 17, defense: 16 },
    baseDamage: 42,
    staminaCost: 29,
    accuracyPercent: 91,
    criticalChancePercent: 16,
    speedTicks: 4,
    recoveryTicks: 4,
    attributeScaling: { elementalAffinity: 1.2, defense: 0.7 },
    effectType: 'stun',
    effectChancePercent: 35,
    soundEffect: 'shower',
    animationName: 'amando'
  },

  // --- Cósmico: Astrassauro ---
  {
    id: 'impacto-meteórico',
    name: 'Impacto Meteórico',
    description: 'Salto gravitacional e queda esmagadora com a força de um bólido.',
    element: 'cosmic',
    category: 'physical',
    compatibleSpecies: ['astrassauro'],
    minStage: 'crianca',
    minLevel: 4,
    requiredAttributes: { strength: 13, agility: 11 },
    baseDamage: 28,
    staminaCost: 20,
    accuracyPercent: 90,
    criticalChancePercent: 15,
    speedTicks: 4,
    recoveryTicks: 4,
    attributeScaling: { strength: 0.9, agility: 0.6 },
    effectType: 'stun',
    effectChancePercent: 25,
    soundEffect: 'burp',
    animationName: 'comendo'
  },
  {
    id: 'pulso-de-supernova',
    name: 'Pulso de Supernova',
    description: 'Liberação estelar catastrófica que distorce o espaço ao redor.',
    element: 'cosmic',
    category: 'special',
    compatibleSpecies: ['astrassauro'],
    minStage: 'adolescente',
    minLevel: 8,
    requiredAttributes: { elementalAffinity: 18, intelligence: 14 },
    baseDamage: 46,
    staminaCost: 34,
    accuracyPercent: 88,
    criticalChancePercent: 18,
    speedTicks: 5,
    recoveryTicks: 5,
    attributeScaling: { elementalAffinity: 1.3, intelligence: 0.8 },
    effectType: 'burn',
    effectChancePercent: 40,
    soundEffect: 'dead',
    animationName: 'amando'
  }
];

const STAGE_ORDER: Readonly<Record<CharacterLifeStage, number>> = {
  ovo: 0,
  baby: 1,
  crianca: 2,
  'pre-adolescente': 3,
  adolescente: 4,
  adulto: 5
};

export function getAttackById(id: string): BattleAttackDefinition | undefined {
  return ATTACKS_CATALOG.find((atk) => atk.id === id);
}

export function isAttackEligibleForParticipant(
  attack: BattleAttackDefinition,
  participant: BattleParticipant
): boolean {
  if (!attack.compatibleSpecies.includes(participant.speciesId)) {
    return false;
  }

  const pStageRank = STAGE_ORDER[participant.stage];
  const reqStageRank = STAGE_ORDER[attack.minStage];
  if (pStageRank < reqStageRank) {
    return false;
  }

  if (participant.level < attack.minLevel) {
    return false;
  }

  if (attack.requiredAttributes) {
    for (const [attrKey, minVal] of Object.entries(attack.requiredAttributes)) {
      const key = attrKey as AttributeKind;
      const currentVal = participant.attributes[key];
      if (currentVal < minVal!) {
        return false;
      }
    }
  }

  return true;
}

export function resolveAvailableAttacks(
  participant: BattleParticipant
): readonly BattleAttackDefinition[] {
  const eligible = ATTACKS_CATALOG.filter((attack) =>
    isAttackEligibleForParticipant(attack, participant)
  );

  if (eligible.length === 0) {
    const fallback = getAttackById('golpe-instintivo');
    /* v8 ignore start */
    if (!fallback) {
      return [];
    }
    /* v8 ignore stop */
    return [fallback];
  }

  return eligible;
}
