import { describe, it, expect } from 'vitest';
import { parseAndValidateManifest } from '../domain/version-manifest-schema';

describe('Version Manifest Schema Validation', () => {
  const validManifest = {
    version: '1.2.0',
    build: 120,
    minimumVersion: '1.0.0',
    releaseDate: '2026-11-08',
    changelog: ['Melhorias de desempenho', 'Correções gerais'],
    webUpdate: {
      available: true,
      version: '1.2.0',
      bundleUrl: 'https://eusouanderson.github.io/PixelForge-AI/web-bundle.zip',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      sizeBytes: 1048576
    },
    androidUpdate: {
      available: false,
      version: '1.2.0',
      apkUrl:
        'https://github.com/eusouanderson/PixelForge-AI/releases/download/v1.2.0/app-debug.apk',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  };

  it('validates a conformant manifest successfully', () => {
    const parsed = parseAndValidateManifest(validManifest);
    expect(parsed.version).toBe('1.2.0');
    expect(parsed.build).toBe(120);
    expect(parsed.webUpdate.available).toBe(true);
    expect(parsed.androidUpdate.available).toBe(false);
  });

  it('rejects invalid semver in version', () => {
    expect(() =>
      parseAndValidateManifest({
        ...validManifest,
        version: 'invalid-semver'
      })
    ).toThrow();
  });

  it('rejects invalid checksum in webUpdate', () => {
    expect(() =>
      parseAndValidateManifest({
        ...validManifest,
        webUpdate: {
          ...validManifest.webUpdate,
          checksum: 'short-checksum'
        }
      })
    ).toThrow();
  });

  it('rejects invalid URL in androidUpdate', () => {
    expect(() =>
      parseAndValidateManifest({
        ...validManifest,
        androidUpdate: {
          ...validManifest.androidUpdate,
          apkUrl: 'not-a-valid-url'
        }
      })
    ).toThrow();
  });

  it('rejects empty changelog or non-positive build', () => {
    expect(() =>
      parseAndValidateManifest({
        ...validManifest,
        changelog: []
      })
    ).toThrow();

    expect(() =>
      parseAndValidateManifest({
        ...validManifest,
        build: -1
      })
    ).toThrow();
  });
});
