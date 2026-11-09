import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpManifestClient, DEFAULT_MANIFEST_URL } from '../infrastructure/http-manifest-client';

describe('HttpManifestClient Infrastructure', () => {
  const validManifest = {
    version: '1.2.0',
    build: 120,
    minimumVersion: '1.0.0',
    releaseDate: '2026-11-08',
    changelog: ['Melhorias de desempenho'],
    webUpdate: {
      available: true,
      version: '1.2.0',
      bundleUrl: 'https://eusouanderson.github.io/PixelForge-AI/web-bundle.zip',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    androidUpdate: {
      available: false,
      version: '1.2.0',
      apkUrl: 'https://github.com/eusouanderson/PixelForge-AI/releases/download/v1.2.0/app.apk',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  };

  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('successfully fetches and validates remote manifest with default URL and query params', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validManifest
    });

    const client = new HttpManifestClient();
    const manifest = await client.fetchManifest();

    expect(manifest.version).toBe('1.2.0');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(DEFAULT_MANIFEST_URL),
      expect.objectContaining({ method: 'GET' })
    );

    // Test with URL containing existing query parameters to cover separator logic
    await client.fetchManifest('https://test.com/version.json?env=prod');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://test.com/version.json?env=prod&_t='),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('throws descriptive error on HTTP non-200 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const client = new HttpManifestClient();
    await expect(client.fetchManifest('https://test.com/manifest.json')).rejects.toThrow(
      'Falha HTTP 404'
    );
  });

  it('throws timeout error when request is aborted', async () => {
    vi.useFakeTimers();
    try {
      globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const client = new HttpManifestClient();
      const fetchPromise = client.fetchManifest('https://test.com/manifest.json', 50);

      vi.advanceTimersByTime(60);

      await expect(fetchPromise).rejects.toThrow('Timeout de 50ms');
    } finally {
      vi.useRealTimers();
    }
  });

  it('converts browser Failed to fetch and network errors into clear friendly message', async () => {
    const client = new HttpManifestClient();

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(client.fetchManifest()).rejects.toThrow(
      'Não foi possível conectar ao servidor de atualizações'
    );

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    await expect(client.fetchManifest()).rejects.toThrow(
      'Não foi possível conectar ao servidor de atualizações'
    );

    const netErr = new Error('Network failure');
    netErr.name = 'NetworkError';
    globalThis.fetch = vi.fn().mockRejectedValue(netErr);
    await expect(client.fetchManifest()).rejects.toThrow(
      'Não foi possível conectar ao servidor de atualizações'
    );

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Cross-Origin Request Blocked by CORS'));
    await expect(client.fetchManifest()).rejects.toThrow(
      'Não foi possível conectar ao servidor de atualizações'
    );
  });

  it('rethrows unexpected non-network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Custom parsing failure'));

    const client = new HttpManifestClient();
    await expect(client.fetchManifest()).rejects.toThrow('Custom parsing failure');
  });
});
