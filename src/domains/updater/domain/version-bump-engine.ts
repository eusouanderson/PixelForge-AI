import type { VersionBumpResult, VersionBumpType } from '../types';
import { parseSemver } from './semver';

export function determineBumpTypeFromCommits(
  commitMessages: string | readonly string[]
): VersionBumpType {
  const text = Array.isArray(commitMessages) ? commitMessages.join('\n') : commitMessages;

  if (!text || typeof text !== 'string') {
    return 'patch';
  }

  // Major: Breaking changes or explicit major markers
  if (
    /BREAKING[ -]CHANGE/i.test(text) ||
    /breaking:/i.test(text) ||
    /^[a-z]+(\([a-z0-9_-]+\))?!:/im.test(text)
  ) {
    return 'major';
  }

  // Minor: Feature commits
  if (
    /^[a-z]*feat(\([a-z0-9_-]+\))?:/im.test(text) ||
    /\bfeature\b/i.test(text)
  ) {
    return 'minor';
  }

  return 'patch';
}

export function calculateNextVersion(
  currentVersion: string,
  bumpType: VersionBumpType,
  explicitBuild?: number
): VersionBumpResult {
  const parsed = parseSemver(currentVersion);

  let major = parsed.major;
  let minor = parsed.minor;
  let patch = parsed.patch;

  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  const nextVersion = `${major}.${minor}.${patch}`;
  const nextBuild = explicitBuild ?? (major * 10000 + minor * 100 + patch);
  const apkFilename = `pixelforge-virtual-creatures-v${nextVersion}.apk`;
  const tagName = `v${nextVersion}`;
  const releaseTitle = `PixelForge AI v${nextVersion}`;

  return {
    currentVersion,
    nextVersion,
    nextBuild,
    bumpType,
    apkFilename,
    tagName,
    releaseTitle
  };
}
