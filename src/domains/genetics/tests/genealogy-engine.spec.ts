import { describe, it, expect } from 'vitest';
import {
  buildGenealogyNode,
  flattenAncestors,
  formatGenealogyLineageSummary
} from '../domain/genealogy-engine';
import { createGenesisGenome } from '../domain/dna-engine';
import { crossGenomes } from '../domain/inheritance-engine';

describe('Genetics: Genealogy Engine', () => {
  const sire = createGenesisGenome('ignisauro', 'male', 1000, 'sire-uuid');
  const dam = createGenesisGenome('terrassauro', 'female', 1000, 'dam-uuid');
  const child = crossGenomes(sire, dam, 2000, {}, 'child-uuid');

  it('builds genealogy node for a founder generation 1 genome', () => {
    const node = buildGenealogyNode(sire);
    expect(node.genomeId).toBe('sire-uuid');
    expect(node.generation).toBe(1);
    expect(node.sire).toBeUndefined();
    expect(node.dam).toBeUndefined();

    const summary = formatGenealogyLineageSummary(node);
    expect(summary).toContain('Linhagem Primordial (Geração Fundadora)');

    const femaleNode = buildGenealogyNode(dam);
    const femaleSummary = formatGenealogyLineageSummary(femaleNode);
    expect(femaleSummary).toContain('♀ Fêmea');
  });

  it('builds genealogy node for offspring with ancestor map or fallback parent stubs', () => {
    const ancestorMap = {
      [sire.genomeId]: sire,
      [dam.genomeId]: dam
    };

    const nodeWithMap = buildGenealogyNode(child, ancestorMap);
    expect(nodeWithMap.generation).toBe(2);
    expect(nodeWithMap.sire?.genomeId).toBe('sire-uuid');
    expect(nodeWithMap.dam?.genomeId).toBe('dam-uuid');

    const flattened = flattenAncestors(nodeWithMap);
    expect(flattened).toHaveLength(3); // child, sire, dam

    const summary = formatGenealogyLineageSummary(nodeWithMap);
    expect(summary).toContain('Pai: Ignisauro (Gen 1)');
    expect(summary).toContain('Mãe: Terrassauro (Gen 1)');

    // Fallback when ancestor map is missing the ancestors
    const nodeWithoutMap = buildGenealogyNode(child, {});
    expect(nodeWithoutMap.sire?.name).toBe('Ignisauro');
    expect(nodeWithoutMap.dam?.name).toBe('Terrassauro');

    // Fallback when genome species is unknown
    const unknownGenome = {
      ...child,
      species: 'desconhecido' as unknown as import('@/domains/characters/types').CharacterId
    };
    const unknownNode = buildGenealogyNode(unknownGenome);
    expect(unknownNode.name).toBe('desconhecido');
  });
});
