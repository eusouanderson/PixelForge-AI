import { describe, it, expect } from 'vitest';
import {
  checkInbreeding,
  evaluateBreedingCompatibility,
  getSpeciesAffinity
} from '../domain/compatibility-engine';
import { createGenesisGenome } from '../domain/dna-engine';

describe('Genetics: Compatibility Engine', () => {
  const maleIgnis = createGenesisGenome('ignisauro', 'male', 1000, 'male-ignis-uuid');
  const femaleTerras = createGenesisGenome('terrassauro', 'female', 1000, 'female-terras-uuid');
  const femaleIgnis = createGenesisGenome('ignisauro', 'female', 1000, 'female-ignis-uuid');
  const maleTerras = createGenesisGenome('terrassauro', 'male', 1000, 'male-terras-uuid');

  it('evaluates species affinity for same species and defined cross pairs', () => {
    const same = getSpeciesAffinity('ignisauro', 'ignisauro');
    expect(same.canBreed).toBe(true);
    expect(same.synergy).toBe(1.0);
    expect(same.possibleOffspring).toEqual(['ignisauro']);

    const cross1 = getSpeciesAffinity('ignisauro', 'terrassauro');
    expect(cross1.canBreed).toBe(true);
    expect(cross1.synergy).toBe(0.95);
    expect(cross1.possibleOffspring).toEqual(['ignisauro', 'terrassauro']);

    const crossReverse = getSpeciesAffinity('terrassauro', 'ignisauro');
    expect(crossReverse.synergy).toBe(0.95);

    const fallbackPair = getSpeciesAffinity('ignisauro', 'rosassauro');
    expect(fallbackPair.canBreed).toBe(true);
    expect(fallbackPair.synergy).toBe(0.75);
  });

  it('blocks same-sex breeding', () => {
    const maleMaleRes = evaluateBreedingCompatibility({
      genomeA: maleIgnis,
      stageA: 'adulto',
      healthA: 'healthy',
      genomeB: maleTerras,
      stageB: 'adulto',
      healthB: 'healthy'
    });
    expect(maleMaleRes.compatible).toBe(false);
    expect(maleMaleRes.reasons).toContain('Dois machos não podem reproduzir. A reprodução exige um macho e uma fêmea.');

    const femaleFemaleRes = evaluateBreedingCompatibility({
      genomeA: femaleIgnis,
      stageA: 'adulto',
      healthA: 'healthy',
      genomeB: femaleTerras,
      stageB: 'adulto',
      healthB: 'healthy'
    });
    expect(femaleFemaleRes.compatible).toBe(false);
    expect(femaleFemaleRes.reasons).toContain('Duas fêmeas não podem reproduzir. A reprodução exige um macho e uma fêmea.');
  });

  it('blocks non-adult or deceased creatures', () => {
    const babyRes = evaluateBreedingCompatibility({
      genomeA: maleIgnis,
      stageA: 'baby',
      healthA: 'healthy',
      genomeB: femaleTerras,
      stageB: 'adolescente',
      healthB: 'healthy'
    });
    expect(babyRes.compatible).toBe(false);
    expect(babyRes.reasons).toContain('O primeiro dinossauro ainda não atingiu a maturidade sexual (Adulto).');
    expect(babyRes.reasons).toContain('O segundo dinossauro ainda não atingiu a maturidade sexual (Adulto).');

    const deceasedRes = evaluateBreedingCompatibility({
      genomeA: maleIgnis,
      stageA: 'adulto',
      healthA: 'deceased',
      genomeB: femaleTerras,
      stageB: 'adulto',
      healthB: 'deceased'
    });
    expect(deceasedRes.compatible).toBe(false);
    expect(deceasedRes.reasons).toContain('O primeiro dinossauro está falecido e não pode reproduzir.');
    expect(deceasedRes.reasons).toContain('O segundo dinossauro está falecido e não pode reproduzir.');
  });

  it('handles inbreeding checks for self, parent-child, full-sibling, and half-sibling', () => {
    // Self
    const selfCheck = checkInbreeding(maleIgnis, maleIgnis);
    expect(selfCheck.isAllowed).toBe(false);
    expect(selfCheck.riskLevel).toBe('forbidden_direct');

    // Child of maleIgnis and femaleTerras
    const childGenome = {
      ...femaleIgnis,
      genomeId: 'child-genome-id',
      parents: {
        sireId: 'ignisauro',
        damId: 'terrassauro',
        sireGenomeId: maleIgnis.genomeId,
        damGenomeId: femaleTerras.genomeId,
        sireSpecies: 'ignisauro' as const,
        damSpecies: 'terrassauro' as const,
        sireName: 'Ignisauro',
        damName: 'Terrassauro'
      }
    };

    // Parent with Child
    const parentChildA = checkInbreeding(maleIgnis, childGenome);
    expect(parentChildA.isAllowed).toBe(false);
    expect(parentChildA.riskLevel).toBe('forbidden_direct');

    const parentChildB = checkInbreeding(childGenome, femaleTerras);
    expect(parentChildB.isAllowed).toBe(false);

    // Full sibling
    const siblingGenome = {
      ...maleTerras,
      genomeId: 'sibling-genome-id',
      parents: childGenome.parents
    };

    const siblingCheck = checkInbreeding(childGenome, siblingGenome);
    expect(siblingCheck.isAllowed).toBe(false);
    expect(siblingCheck.riskLevel).toBe('forbidden_direct');

    // Half sibling (shares sire only)
    const halfSibling = {
      ...maleTerras,
      genomeId: 'half-sibling-id',
      parents: {
        ...childGenome.parents,
        damGenomeId: 'different-dam-uuid'
      }
    };
    const halfCheck = checkInbreeding(childGenome, halfSibling);
    expect(halfCheck.isAllowed).toBe(true);
    expect(halfCheck.riskLevel).toBe('high');

    // Half sibling (shares dam only)
    const halfSiblingDam = {
      ...maleTerras,
      genomeId: 'half-sibling-dam-id',
      parents: {
        ...childGenome.parents,
        sireGenomeId: 'different-sire-uuid'
      }
    };
    const halfDamCheck = checkInbreeding(childGenome, halfSiblingDam);
    expect(halfDamCheck.isAllowed).toBe(true);
    expect(halfDamCheck.riskLevel).toBe('high');

    // Unrelated
    const unrelatedCheck = checkInbreeding(maleIgnis, femaleTerras);
    expect(unrelatedCheck.isAllowed).toBe(true);
    expect(unrelatedCheck.riskLevel).toBe('none');
  });

  it('blocks breeding if species affinity canBreed is false', () => {
    const maleToxi = createGenesisGenome('toxissauro', 'male', 1000, 'male-toxi-uuid');
    const femaleRosa = createGenesisGenome('rosassauro', 'female', 1000, 'female-rosa-uuid');

    const res = evaluateBreedingCompatibility({
      genomeA: maleToxi,
      stageA: 'adulto',
      healthA: 'healthy',
      genomeB: femaleRosa,
      stageB: 'adulto',
      healthB: 'healthy'
    });
    expect(res.compatible).toBe(false);
    expect(res.reasons).toContain('As espécies não são geneticamente compatíveis.');
  });

  it('blocks inbreeding through evaluateBreedingCompatibility', () => {
    const parentChildRes = evaluateBreedingCompatibility({
      genomeA: maleIgnis,
      stageA: 'adulto',
      healthA: 'healthy',
      genomeB: {
        ...femaleTerras,
        parents: {
          sireId: 'ignisauro',
          damId: 'terrassauro',
          sireGenomeId: maleIgnis.genomeId,
          damGenomeId: 'some-dam-id',
          sireSpecies: 'ignisauro',
          damSpecies: 'terrassauro',
          sireName: 'Ignisauro',
          damName: 'Terrassauro'
        }
      },
      stageB: 'adulto',
      healthB: 'healthy'
    });
    expect(parentChildRes.compatible).toBe(false);
    expect(parentChildRes.reasons.some((r) => r.includes('progenitor e descendente'))).toBe(true);
  });

  it('allows valid compatible adult male and female pairing', () => {
    const valid = evaluateBreedingCompatibility({
      genomeA: maleIgnis,
      stageA: 'adulto',
      healthA: 'healthy',
      genomeB: femaleTerras,
      stageB: 'adulto',
      healthB: 'healthy'
    });
    expect(valid.compatible).toBe(true);
    expect(valid.reasons).toHaveLength(0);
    expect(valid.elementalSynergy).toBe(0.95);
    expect(valid.projectedOffspringSpeciesOptions).toEqual(['ignisauro', 'terrassauro']);
  });
});
