import { calculateSha256 } from '@/domains/updater/domain/checksum';
import type { OwnershipResolution } from '../types';

export async function sha256String(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return calculateSha256(data);
}

export function generateCryptoSeed(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateCommitment(
  secretSeed: string,
  salt: string
): Promise<string> {
  return sha256String(`${salt}:${secretSeed}`);
}

export async function verifyCommitment(
  commitHash: string,
  secretSeed: string,
  salt: string
): Promise<boolean> {
  const recalculated = await generateCommitment(secretSeed, salt);
  return recalculated.toLowerCase() === commitHash.trim().toLowerCase();
}

export async function resolveFairOwnership(
  peerA: string,
  seedA: string,
  peerB: string,
  seedB: string,
  localPeerId: string
): Promise<OwnershipResolution> {
  if (!peerA || !peerB) {
    throw new Error('Ambos os participantes devem estar definidos para o sorteio.');
  }
  if (!seedA || !seedB) {
    throw new Error('Ambas as sementes criptográficas devem ser fornecidas.');
  }

  // Canonical ordering of seeds so that resolveFairOwnership(A, seedA, B, seedB)
  // produces identical results whether called as (A, seedA, B, seedB) or (B, seedB, A, seedA)
  const isAFirst = peerA.localeCompare(peerB) <= 0;
  const canonicalPeer1 = isAFirst ? peerA : peerB;
  const canonicalSeed1 = isAFirst ? seedA : seedB;
  const canonicalPeer2 = isAFirst ? peerB : peerA;
  const canonicalSeed2 = isAFirst ? seedB : seedA;

  const combinedSeedHash = await sha256String(
    `${canonicalPeer1}:${canonicalSeed1}__${canonicalPeer2}:${canonicalSeed2}`
  );

  const hexSlice = combinedSeedHash.slice(0, 8);
  const numericValue = parseInt(hexSlice, 16);
  const isPeer1Winner = numericValue % 2 === 0;

  const winningPeerId = isPeer1Winner ? canonicalPeer1 : canonicalPeer2;
  const losingPeerId = isPeer1Winner ? canonicalPeer2 : canonicalPeer1;
  const isLocalWinner = winningPeerId === localPeerId;

  return {
    winningPeerId,
    losingPeerId,
    combinedSeedHash,
    isLocalWinner
  };
}

export function deterministicUuidFromSeed(seed: string): string {
  const hex = seed.toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32);
  const p1 = hex.slice(0, 8);
  const p2 = hex.slice(8, 12);
  const p3 = `4${hex.slice(13, 16)}`;
  const p4 = `a${hex.slice(17, 20)}`;
  const p5 = hex.slice(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

export function createSharedRandomSource(combinedSeedHash: string): {
  readonly sexRandom: number;
  readonly speciesPickRandom: number;
  readonly mutationRollRandom: number;
  readonly mutationAttrRandom: number;
  readonly colorDominanceRandom: number;
  readonly patternRandom: number;
  readonly scaleVarianceRandom: number;
} {
  const getSliceFloat = (start: number): number => {
    const slice = combinedSeedHash.slice(start, start + 8);
    const num = parseInt(slice, 16);
    return (num % 100000) / 100000;
  };

  return {
    sexRandom: getSliceFloat(0),
    speciesPickRandom: getSliceFloat(4),
    mutationRollRandom: getSliceFloat(8),
    mutationAttrRandom: getSliceFloat(12),
    colorDominanceRandom: getSliceFloat(16),
    patternRandom: getSliceFloat(20),
    scaleVarianceRandom: getSliceFloat(24)
  };
}
