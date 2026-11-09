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

    // Cache-busting via query parameter avoids CORS preflight (OPTIONS) on GitHub Pages
    const separator = url.includes('?') ? '&' : '?';
    const targetUrl = `${url}${separator}_t=${Date.now()}`;

    try {
      // CORS Simple Request: Only Accept header is sent to avoid browser preflight OPTIONS requests
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
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
      if (
        (err instanceof TypeError && (
          err.message === 'Failed to fetch' ||
          err.message.includes('fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('Load failed')
        )) ||
        (err instanceof Error && err.name === 'NetworkError') ||
        (err instanceof Error && err.message.includes('Cross-Origin Request Blocked'))
      ) {
        throw new Error(
          'Não foi possível conectar ao servidor de atualizações (sem conexão ou rede indisponível).',
          { cause: err }
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}
