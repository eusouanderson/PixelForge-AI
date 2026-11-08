import type { AppVersionManifest } from '../types';
import { parseAndValidateManifest } from '../domain/version-manifest-schema';

export const DEFAULT_MANIFEST_URL = 'https://eusouanderson.github.io/PixelForge-AI/version.json';

export class HttpManifestClient {
  public async fetchManifest(
    url: string = DEFAULT_MANIFEST_URL,
    timeoutMs: number = 6000
  ): Promise<AppVersionManifest> {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Falha HTTP ${response.status} ao consultar manifesto em ${url}`);
      }

      const json: unknown = await response.json();
      return parseAndValidateManifest(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Timeout de ${timeoutMs}ms ao consultar manifesto de versões.`, {
          cause: err
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}
