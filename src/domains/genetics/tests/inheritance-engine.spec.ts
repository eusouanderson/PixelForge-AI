import { describe, it, expect } from 'vitest';
import {
  crossGenomes,
  inheritAllelePair
} from '../domain/inheritance-engine';
import { createGenesisGenome } from '../domain/dna-engine';

describe('Genetics: Inheritance Engine', () => {
  const sire = createGenesisGenome('ignisauro', 'male', 1000, 'sire-uuid');
  const dam = createGenesisGenome('glacissauro', 'female', 1000, 'dam-uuid');

  it('inherits allele pair based on picks', () => {
    const pair1 = inheritAllelePair(
      { paternal: 18, maternal: 14 },
      { paternal: 22, maternal: 26 },
      0.1, // picks paternal 18
      0.9 // picks maternal 26
    );
    expect(pair1).toEqual({ paternal: 18, maternal: 26 });

    const pair2 = inheritAllelePair(
      { paternal: 18, maternal: 14 },
      { paternal: 22, maternal: 26 },
      0.8, // picks maternal 14
      0.2 // picks paternal 22
    );
    expect(pair2).toEqual({ paternal: 14, maternal: 22 });
  });

  it('crosses genomes and produces generation N+1 offspring with correct parentage and Mendelian inheritance', () => {
    const offspring = crossGenomes(
      sire,
      dam,
      5000,
      {
        sexRandom: 0.2, // male
        speciesPickRandom: 0.1, // picks ignisauro
        mutationRollRandom: 0.9, // no mutation
        colorDominanceRandom: 0.3,
        patternRandom: 0.1,
        scaleVarianceRandom: 0.5
      },
      'child-uuid'
    );

    expect(offspring.genomeId).toBe('child-uuid');
    expect(offspring.generation).toBe(2);
    expect(offspring.sex).toBe('male');
    expect(offspring.species).toBe('ignisauro');
    expect(offspring.parents).toEqual({
      sireId: 'ignisauro',
      damId: 'glacissauro',
      sireGenomeId: 'sire-uuid',
      damGenomeId: 'dam-uuid',
      sireSpecies: 'ignisauro',
      damSpecies: 'glacissauro',
      sireName: 'Ignisauro',
      damName: 'Glacissauro'
    });
    expect(offspring.createdAtMs).toBe(5000);
  });

  it('crosses genomes with female sex and applies mutations and pattern overrides', () => {
    const offspring = crossGenomes(sire, dam, 6000, {
      sexRandom: 0.8, // female
      speciesPickRandom: 0.8, // picks glacissauro
      mutationRollRandom: 0.001, // mythic mutation
      mutationAttrRandom: 0.0, // strength
      colorDominanceRandom: 0.9,
      patternRandom: 0.95,
      scaleVarianceRandom: 0.9
    });

    expect(offspring.sex).toBe('female');
    expect(offspring.species).toBe('glacissauro');
    expect(offspring.mutations).toHaveLength(1);
    expect(offspring.mutations[0].rarity).toBe('mythic');
    expect(offspring.appearance.pattern).toBe('elemental_glow');
    expect(offspring.appearance.primaryColor.dominant).toBe('#f43f5e');

    // Inherit dam pattern when patternRoll is between 0.6 and 0.9
    const damPatternChild = crossGenomes(sire, dam, 6500, {
      mutationRollRandom: 0.9,
      patternRandom: 0.75
    });
    expect(damPatternChild.appearance.pattern).toBe(dam.appearance.pattern);
  });

  it('uses default random values if random source is empty', () => {
    const offspring = crossGenomes(sire, dam, 7000);
    expect(offspring.generation).toBe(2);
    expect(['male', 'female']).toContain(offspring.sex);
    expect(['ignisauro', 'glacissauro']).toContain(offspring.species);

    // Fallback when parent species definitions are missing in registry
    const unknownSire = {
      ...sire,
      species: 'custom_sire' as unknown as import('@/domains/characters/types').CharacterId
    };
    const unknownDam = {
      ...dam,
      species: 'custom_dam' as unknown as import('@/domains/characters/types').CharacterId
    };
    const unknownOffspring = crossGenomes(unknownSire, unknownDam, 8000, {
      speciesPickRandom: 0.1
    });
    expect(unknownOffspring.parents?.sireName).toBe('custom_sire');
    expect(unknownOffspring.parents?.damName).toBe('custom_dam');
  });
});
