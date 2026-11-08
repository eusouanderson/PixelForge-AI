import { describe, it, expect } from 'vitest';
import { evaluateUpdateNecessity } from '../domain/updater-engine';
import type { AppVersionManifest, InstalledAppInfo } from '../types';

describe('Updater Engine Evaluation Logic', () => {
  const baseManifest: AppVersionManifest = {
    version: '1.2.0',
    build: 120,
    minimumVersion: '1.0.0',
    releaseDate: '2026-11-08',
    changelog: ['Notas de release'],
    webUpdate: {
      available: true,
      version: '1.2.0',
      bundleUrl: 'https://eusouanderson.github.io/PixelForge-AI/web-bundle.zip',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    androidUpdate: {
      available: true,
      version: '1.2.0',
      apkUrl: 'https://github.com/eusouanderson/PixelForge-AI/releases/download/v1.2.0/app.apk',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  };

  const installedWeb: InstalledAppInfo = {
    version: '1.0.0',
    build: 100,
    platform: 'web',
    isNative: false
  };

  const installedAndroid: InstalledAppInfo = {
    version: '1.0.0',
    build: 100,
    platform: 'android',
    isNative: true
  };

  it('enforces mandatory update when current version is below minimumVersion (Android and Web)', () => {
    const strictManifest: AppVersionManifest = {
      ...baseManifest,
      minimumVersion: '1.1.0'
    };

    // Android native client with androidUpdate available
    const androidRes = evaluateUpdateNecessity(installedAndroid, strictManifest);
    expect(androidRes.isMandatory).toBe(true);
    expect(androidRes.updateType).toBe('android');

    // Web client
    const webRes = evaluateUpdateNecessity(installedWeb, strictManifest);
    expect(webRes.isMandatory).toBe(true);
    expect(webRes.updateType).toBe('web');
  });

  it('prevents accidental downgrade when remote manifest is older than installed version', () => {
    const olderManifest: AppVersionManifest = {
      ...baseManifest,
      version: '0.9.0'
    };

    const res = evaluateUpdateNecessity(installedWeb, olderManifest);
    expect(res.updateType).toBe('none');
    expect(res.message).toContain('Downgrade evitado');
  });

  it('detects native Android update when native code version is greater', () => {
    const res = evaluateUpdateNecessity(installedAndroid, baseManifest);
    expect(res.updateType).toBe('android');
    expect(res.targetVersion).toBe('1.2.0');
    expect(res.isMandatory).toBe(false);
  });

  it('detects silent web update when web version is greater', () => {
    const webManifest: AppVersionManifest = {
      ...baseManifest,
      androidUpdate: {
        ...baseManifest.androidUpdate,
        available: false
      }
    };

    const res = evaluateUpdateNecessity(installedAndroid, webManifest);
    expect(res.updateType).toBe('web');
    expect(res.targetVersion).toBe('1.2.0');
  });

  it('detects silent web update when semver is same but build number is newer', () => {
    const sameVersionHigherBuild: AppVersionManifest = {
      ...baseManifest,
      version: '1.0.0',
      build: 105,
      webUpdate: {
        ...baseManifest.webUpdate,
        version: '1.0.0'
      },
      androidUpdate: {
        ...baseManifest.androidUpdate,
        version: '1.0.0'
      }
    };

    const res = evaluateUpdateNecessity(installedWeb, sameVersionHigherBuild);
    expect(res.updateType).toBe('web');
    expect(res.targetBuild).toBe(105);
  });

  it('returns up_to_date when installed version matches or is newer', () => {
    const identicalManifest: AppVersionManifest = {
      ...baseManifest,
      version: '1.0.0',
      build: 100,
      webUpdate: {
        ...baseManifest.webUpdate,
        version: '1.0.0'
      },
      androidUpdate: {
        ...baseManifest.androidUpdate,
        version: '1.0.0'
      }
    };

    const res = evaluateUpdateNecessity(installedWeb, identicalManifest);
    expect(res.updateType).toBe('none');
    expect(res.message).toContain('já está atualizado');
  });
});
