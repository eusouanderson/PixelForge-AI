import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  compareSemver,
  isSemverGreater,
  isSemverAtLeast
} from '../domain/semver';

describe('Semver Domain Utility', () => {
  it('parses valid and prefixed semver strings', () => {
    const s1 = parseSemver('v1.2.3');
    expect(s1).toEqual({ major: 1, minor: 2, patch: 3, prerelease: undefined });

    const s2 = parseSemver('2.0.0-beta.1+build.42');
    expect(s2).toEqual({ major: 2, minor: 0, patch: 0, prerelease: 'beta.1' });

    const s3 = parseSemver('invalid.semver.text');
    expect(s3).toEqual({ major: 0, minor: 0, patch: 0, prerelease: undefined });

    const s4 = parseSemver('1');
    expect(s4).toEqual({ major: 1, minor: 0, patch: 0, prerelease: undefined });

    const s5 = parseSemver('1.2');
    expect(s5).toEqual({ major: 1, minor: 2, patch: 0, prerelease: undefined });

    const s6 = parseSemver('');
    expect(s6).toEqual({ major: 0, minor: 0, patch: 0, prerelease: undefined });
  });

  it('correctly compares major, minor, and patch levels', () => {
    expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);

    expect(compareSemver('1.2.0', '1.1.9')).toBe(1);
    expect(compareSemver('1.1.0', '1.2.0')).toBe(-1);

    expect(compareSemver('1.0.2', '1.0.1')).toBe(1);
    expect(compareSemver('1.0.1', '1.0.2')).toBe(-1);

    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('handles prerelease comparisons correctly', () => {
    // Non-prerelease is higher than prerelease of the same version
    expect(compareSemver('1.0.0', '1.0.0-rc.1')).toBe(1);
    expect(compareSemver('1.0.0-rc.1', '1.0.0')).toBe(-1);

    // Prerelease alphabetical comparison
    expect(compareSemver('1.0.0-beta', '1.0.0-alpha')).toBe(1);
    expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    expect(compareSemver('1.0.0-beta', '1.0.0-beta')).toBe(0);
  });

  it('evaluates isSemverGreater and isSemverAtLeast', () => {
    expect(isSemverGreater('1.1.0', '1.0.0')).toBe(true);
    expect(isSemverGreater('1.0.0', '1.0.0')).toBe(false);

    expect(isSemverAtLeast('1.0.0', '1.0.0')).toBe(true);
    expect(isSemverAtLeast('1.1.0', '1.0.0')).toBe(true);
    expect(isSemverAtLeast('0.9.9', '1.0.0')).toBe(false);
  });
});
