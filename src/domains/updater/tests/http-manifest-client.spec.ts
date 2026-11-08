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

  it('successfully fetches and validates remote manifest with default URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validManifest
    });

    const client = new HttpManifestClient();
    const manifest = await client.fetchManifest();

    expect(manifest.version).toBe('1.2.0');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      DEFAULT_MANIFEST_URL,
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

  it('rethrows unexpected network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const client = new HttpManifestClient();
    await expect(client.fetchManifest()).rejects.toThrow('Network failure');
  });
});
