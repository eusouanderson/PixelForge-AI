import { describe, it, expect } from 'vitest';
import {
  generateCommitment,
  generateCryptoSeed,
  resolveFairOwnership,
  sha256String,
  verifyCommitment
} from '../domain/consensus-engine';

describe('Breeding: Consensus Engine', () => {
  it('generates sha256 string for arbitrary text', async () => {
    const hash = await sha256String('pixelforge-consensus');
    expect(hash).toHaveLength(64);
  });

  it('generates crypto seed using crypto or fallback', () => {
    const seed1 = generateCryptoSeed();
    expect(seed1).toHaveLength(32);

    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true
    });

    const seedFallback = generateCryptoSeed();
    expect(seedFallback).toHaveLength(32);

    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true
    });
  });

  it('generates commitment and verifies it correctly', async () => {
    const seed = 'my-secret-seed-1234';
    const salt = 'random-salt-5678';
    const commitHash = await generateCommitment(seed, salt);

    const valid = await verifyCommitment(commitHash, seed, salt);
    expect(valid).toBe(true);

    const invalidSeed = await verifyCommitment(commitHash, 'wrong-seed', salt);
    expect(invalidSeed).toBe(false);

    const invalidSalt = await verifyCommitment(commitHash, seed, 'wrong-salt');
    expect(invalidSalt).toBe(false);
  });

  it('resolves fair ownership deterministically for both peers', async () => {
    const peerA = 'peer-device-alpha';
    const seedA = 'seed-alpha-123';
    const peerB = 'peer-device-beta';
    const seedB = 'seed-beta-456';

    const resolutionA = await resolveFairOwnership(peerA, seedA, peerB, seedB, peerA);
    const resolutionB = await resolveFairOwnership(peerB, seedB, peerA, seedA, peerB);

    // Both resolutions agree on winning peer
    expect(resolutionA.winningPeerId).toBe(resolutionB.winningPeerId);
    expect(resolutionA.losingPeerId).toBe(resolutionB.losingPeerId);
    expect(resolutionA.combinedSeedHash).toBe(resolutionB.combinedSeedHash);

    // Exactly one winner
    expect(resolutionA.isLocalWinner !== resolutionB.isLocalWinner).toBe(true);

    // Test reverse alphabetical peer order and odd hash slice (peer 2 wins)
    const resolutionRev = await resolveFairOwnership('peer-z', 'seed-z', 'peer-a', 'seed-a', 'peer-z');
    expect(resolutionRev.winningPeerId).toBeDefined();

    // Exercise both peer 1 and peer 2 winning branches
    let sawPeer1Win = false;
    let sawPeer2Win = false;
    for (let i = 0; i < 10; i++) {
      const res = await resolveFairOwnership('peer-1', `seed-${i}`, 'peer-2', `seed-x-${i}`, 'peer-1');
      if (res.winningPeerId === 'peer-1') sawPeer1Win = true;
      if (res.winningPeerId === 'peer-2') sawPeer2Win = true;
    }
    expect(sawPeer1Win).toBe(true);
    expect(sawPeer2Win).toBe(true);
  });

  it('throws error when peers or seeds are missing', async () => {
    await expect(resolveFairOwnership('', 's1', 'p2', 's2', 'p1')).rejects.toThrow(
      'Ambos os participantes devem estar definidos para o sorteio.'
    );
    await expect(resolveFairOwnership('p1', '', 'p2', 's2', 'p1')).rejects.toThrow(
      'Ambas as sementes criptográficas devem ser fornecidas.'
    );
  });
});
