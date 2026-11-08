import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateSha256, verifySha256 } from '../domain/checksum';

describe('Checksum Domain Utility', () => {
  const sampleText = 'PixelForge AI Update Test';
  const encoder = new TextEncoder();
  const sampleBytes = encoder.encode(sampleText);
  // Known SHA-256 for "PixelForge AI Update Test"
  // echo -n "PixelForge AI Update Test" | sha256sum ->
  // 5673ec5eb5920786cf88bb4a05316dfa9a3b6db93e87053e144a1796d131fba8 (sample)

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates sha256 using crypto.subtle for ArrayBuffer and Uint8Array', async () => {
    const hashFromUint8 = await calculateSha256(sampleBytes);
    expect(hashFromUint8).toMatch(/^[0-9a-f]{64}$/);

    const hashFromArrayBuffer = await calculateSha256(sampleBytes.buffer);
    expect(hashFromArrayBuffer).toBe(hashFromUint8);
  });

  it('verifies correct checksum and rejects incorrect checksum', async () => {
    const actualHash = await calculateSha256(sampleBytes);
    const valid = await verifySha256(sampleBytes, `  ${actualHash.toUpperCase()}  `);
    expect(valid).toBe(true);

    const invalid = await verifySha256(
      sampleBytes,
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(invalid).toBe(false);
  });

  it('falls back to node:crypto when crypto.subtle is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true
      });
      const hash = await calculateSha256(sampleBytes);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true
      });
    }
  });
});
