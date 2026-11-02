import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validatePixelArt } from './pixel-art-schema';

describe('examples validation', () => {
  function findJsonFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findJsonFiles(fullPath));
      } else if (entry.endsWith('.json')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('validates all JSON files in examples against DeclarativePixelArtSchema', () => {
    const jsonFiles = findJsonFiles('examples');
    expect(jsonFiles.length).toBeGreaterThanOrEqual(6);

    for (const filePath of jsonFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const rawData = JSON.parse(content);
      const validated = validatePixelArt(rawData);

      expect(validated.name).toBeTruthy();
      expect(typeof validated.metadata?.creatureName).toBe('string');
      expect(['ovo', 'baby', 'crianca', 'pre-adolescente', 'adolescente', 'adulto']).toContain(
        validated.metadata?.lifeStage
      );
      expect(typeof validated.metadata?.frame).toBe('number');
      expect(validated.logicalDimensions.width).toBe(32);
      expect(validated.logicalDimensions.height).toBe(32);
      expect(validated.palette.transparent).toBe('#00000000');
    }
  });
});
