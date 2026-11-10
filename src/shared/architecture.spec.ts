import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_DOMAINS = [
  'characters',
  'pet-needs',
  'attributes',
  'feeding',
  'inventory',
  'activities',
  'particles',
  'environments',
  'progression',
  'economy',
  'persistence',
  'settings',
  'updater',
  'genetics',
  'breeding',
  'notifications'
] as const;

function collectTypeScriptFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectTypeScriptFiles(fullPath));
    } else if (entry.endsWith('.ts') || entry.endsWith('.vue')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('DDD Architecture & Domain Boundaries', () => {
  it('ensures every required domain exists and exposes a single primary types.ts contract', () => {
    for (const domain of REQUIRED_DOMAINS) {
      const typesPath = join('src/domains', domain, 'types.ts');
      expect(existsSync(typesPath), `Missing ${typesPath}`).toBe(true);
      const content = readFileSync(typesPath, 'utf-8');
      expect(content.length).toBeGreaterThan(20);
      expect(content).not.toMatch(/:\s*any\b/);
    }
  });

  it('forbids explicit any, @ts-ignore, and @ts-nocheck across all source files', () => {
    const files = collectTypeScriptFiles('src').filter(
      (f) => !f.endsWith('.spec.ts') && !f.endsWith('.test.ts')
    );
    expect(files.length).toBeGreaterThan(10);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `Forbidden @ts-ignore in ${file}`).not.toContain('@ts-ignore');
      expect(content, `Forbidden @ts-nocheck in ${file}`).not.toContain('@ts-nocheck');
      expect(content, `Forbidden explicit any in ${file}`).not.toMatch(/:\s*any\b|<any>/);
    }
  });

  it('prevents game-engine from importing persistence internals directly', () => {
    const engineFiles = collectTypeScriptFiles('src/game-engine');
    for (const file of engineFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]@\/domains\/persistence/);
    }
  });
});

