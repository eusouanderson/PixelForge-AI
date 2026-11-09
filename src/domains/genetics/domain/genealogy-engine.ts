import { CHARACTER_SPECIES_REGISTRY } from '@/domains/characters/domain/character-registry';
import type { CreatureGenome, GenealogyNode } from '../types';

export function buildGenealogyNode(
  genome: CreatureGenome,
  ancestorMap: Readonly<Record<string, CreatureGenome>> = {}
): GenealogyNode {
  const speciesDef = CHARACTER_SPECIES_REGISTRY[genome.species];
  const name = speciesDef?.displayName ?? genome.species;

  let sireNode: GenealogyNode | undefined;
  let damNode: GenealogyNode | undefined;

  if (genome.parents) {
    const sireGenome = ancestorMap[genome.parents.sireGenomeId];
    if (sireGenome) {
      sireNode = buildGenealogyNode(sireGenome, ancestorMap);
    } else {
      sireNode = {
        genomeId: genome.parents.sireGenomeId,
        name: genome.parents.sireName,
        species: genome.parents.sireSpecies,
        generation: Math.max(1, genome.generation - 1),
        sex: 'male',
        mutationsCount: 0,
        bredAtMs: genome.createdAtMs
      };
    }

    const damGenome = ancestorMap[genome.parents.damGenomeId];
    if (damGenome) {
      damNode = buildGenealogyNode(damGenome, ancestorMap);
    } else {
      damNode = {
        genomeId: genome.parents.damGenomeId,
        name: genome.parents.damName,
        species: genome.parents.damSpecies,
        generation: Math.max(1, genome.generation - 1),
        sex: 'female',
        mutationsCount: 0,
        bredAtMs: genome.createdAtMs
      };
    }
  }

  return {
    genomeId: genome.genomeId,
    name,
    species: genome.species,
    generation: genome.generation,
    sex: genome.sex,
    sire: sireNode,
    dam: damNode,
    mutationsCount: genome.mutations.length,
    bredAtMs: genome.createdAtMs
  };
}

export function flattenAncestors(node: GenealogyNode): readonly GenealogyNode[] {
  const result: GenealogyNode[] = [node];
  if (node.sire) {
    result.push(...flattenAncestors(node.sire));
  }
  if (node.dam) {
    result.push(...flattenAncestors(node.dam));
  }
  return result;
}

export function formatGenealogyLineageSummary(node: GenealogyNode): string {
  const lines: string[] = [
    `Gen ${node.generation} - ${node.name} (${node.sex === 'male' ? '♂ Macho' : '♀ Fêmea'})`
  ];
  if (node.sire && node.dam) {
    lines.push(` ├── Pai: ${node.sire.name} (Gen ${node.sire.generation})`);
    lines.push(` └── Mãe: ${node.dam.name} (Gen ${node.dam.generation})`);
  } else {
    lines.push(' └── Linhagem Primordial (Geração Fundadora)');
  }
  return lines.join('\n');
}
