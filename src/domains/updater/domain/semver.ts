export interface ParsedSemver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
}

export function parseSemver(version: string): ParsedSemver {
  const clean = version.trim().replace(/^v/i, '');
  const [core, prerelease] = clean.split('-', 2);
  const parts = core
    ? core.split('.').map((p) => {
        const num = Number.parseInt(p, 10);
        return Number.isNaN(num) ? 0 : num;
      })
    : [];

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease: prerelease ? prerelease.split('+')[0] : undefined
  };
}

export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) {
    return p1.major > p2.major ? 1 : -1;
  }
  if (p1.minor !== p2.minor) {
    return p1.minor > p2.minor ? 1 : -1;
  }
  if (p1.patch !== p2.patch) {
    return p1.patch > p2.patch ? 1 : -1;
  }

  // Prerelease comparison: non-prerelease is higher than prerelease
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}

export function isSemverGreater(candidate: string, current: string): boolean {
  return compareSemver(candidate, current) > 0;
}

export function isSemverAtLeast(candidate: string, minimum: string): boolean {
  return compareSemver(candidate, minimum) >= 0;
}
