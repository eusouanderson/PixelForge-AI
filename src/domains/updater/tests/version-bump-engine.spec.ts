import { describe, it, expect } from 'vitest';
import {
  determineBumpTypeFromCommits,
  calculateNextVersion
} from '../domain/version-bump-engine';

describe('VersionBumpEngine Domain', () => {
  describe('determineBumpTypeFromCommits', () => {
    it('returns patch on empty or non-string inputs', () => {
      expect(determineBumpTypeFromCommits('')).toBe('patch');
      expect(determineBumpTypeFromCommits(null as unknown as string)).toBe('patch');
      expect(determineBumpTypeFromCommits(undefined as unknown as string)).toBe('patch');
      expect(determineBumpTypeFromCommits([])).toBe('patch');
    });

    it('identifies major bumps from breaking changes', () => {
      expect(determineBumpTypeFromCommits('BREAKING CHANGE: overhaul API')).toBe('major');
      expect(determineBumpTypeFromCommits('breaking: remove old protocol')).toBe('major');
      expect(determineBumpTypeFromCommits('feat!: completely rework game engine')).toBe('major');
      expect(determineBumpTypeFromCommits('fix(core)!: break compatibility')).toBe('major');
      expect(
        determineBumpTypeFromCommits([
          'fix: minor bug',
          'BREAKING-CHANGE: dropped legacy storage'
        ])
      ).toBe('major');
    });

    it('identifies minor bumps from feature commits', () => {
      expect(determineBumpTypeFromCommits('feat: add Rosassauro creature')).toBe('minor');
      expect(determineBumpTypeFromCommits('feat(theme): adapt whole APK to animal color')).toBe('minor');
      expect(determineBumpTypeFromCommits('new feature for dinosaur grooming')).toBe('minor');
      expect(
        determineBumpTypeFromCommits([
          'chore: update docs',
          'feat(audio): ambient sound effects',
          'fix: prevent crash'
        ])
      ).toBe('minor');
    });

    it('identifies patch bumps for fixes and maintenance commits', () => {
      expect(determineBumpTypeFromCommits('fix: prevent infinite xp farming')).toBe('patch');
      expect(determineBumpTypeFromCommits('chore: update dependencies')).toBe('patch');
      expect(determineBumpTypeFromCommits('docs: improve readme')).toBe('patch');
      expect(determineBumpTypeFromCommits('refactor: optimize rendering loop')).toBe('patch');
    });
  });

  describe('calculateNextVersion', () => {
    it('calculates minor bump correctly and formats APK name', () => {
      const result = calculateNextVersion('1.0.0', 'minor');

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.nextVersion).toBe('1.1.0');
      expect(result.nextBuild).toBe(10100);
      expect(result.bumpType).toBe('minor');
      expect(result.apkFilename).toBe('pixelforge-virtual-creatures-v1.1.0.apk');
      expect(result.tagName).toBe('v1.1.0');
      expect(result.releaseTitle).toBe('PixelForge AI v1.1.0');
    });

    it('calculates patch bump correctly and formats APK name', () => {
      const result = calculateNextVersion('1.0.0', 'patch');

      expect(result.nextVersion).toBe('1.0.1');
      expect(result.nextBuild).toBe(10001);
      expect(result.apkFilename).toBe('pixelforge-virtual-creatures-v1.0.1.apk');
      expect(result.tagName).toBe('v1.0.1');
    });

    it('calculates major bump correctly and formats APK name', () => {
      const result = calculateNextVersion('1.2.3', 'major');

      expect(result.nextVersion).toBe('2.0.0');
      expect(result.nextBuild).toBe(20000);
      expect(result.apkFilename).toBe('pixelforge-virtual-creatures-v2.0.0.apk');
      expect(result.tagName).toBe('v2.0.0');
    });

    it('respects explicit build number when provided', () => {
      const result = calculateNextVersion('1.0.0', 'minor', 8842);

      expect(result.nextVersion).toBe('1.1.0');
      expect(result.nextBuild).toBe(8842);
    });
  });
});
