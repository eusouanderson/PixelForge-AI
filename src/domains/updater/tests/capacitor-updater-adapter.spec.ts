import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorUpdaterAdapter,
  NativeAppUpdater,
  type AppUpdaterNativePlugin
} from '../infrastructure/capacitor-updater-adapter';
import type { HttpManifestClient } from '../infrastructure/http-manifest-client';
import { APP_CONFIG } from '@/shared/constants/app-config';

describe('CapacitorUpdaterAdapter Infrastructure', () => {
  let mockPlugin: AppUpdaterNativePlugin;
  let mockManifestClient: HttpManifestClient;
  let adapter: CapacitorUpdaterAdapter;

  beforeEach(() => {
    mockPlugin = {
      getAppInfo: vi.fn().mockResolvedValue({
        versionName: '1.2.0',
        versionCode: 120,
        packageName: 'ai.pixelforge.virtualcreatures',
        currentServerBasePath: '/data/user/0/ai.pixelforge/updates/1.2.0'
      }),
      downloadAndExtractWebBundle: vi.fn().mockResolvedValue({
        success: true,
        path: '/updates/1.2.0'
      }),
      downloadAndInstallApk: vi.fn().mockResolvedValue({
        success: true,
        path: '/cache/update.apk'
      }),
      resetToBundledVersion: vi.fn().mockResolvedValue({ success: true })
    };

    mockManifestClient = {
      fetchManifest: vi.fn().mockResolvedValue({
        version: '1.2.0',
        build: 120,
        minimumVersion: '1.0.0',
        releaseDate: '2026-11-08',
        changelog: ['Notas'],
        webUpdate: {
          available: true,
          version: '1.2.0',
          bundleUrl: 'https://test.com/bundle.zip',
          checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        },
        androidUpdate: {
          available: false,
          version: '1.2.0',
          apkUrl: 'https://test.com/app.apk',
          checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        }
      })
    } as unknown as HttpManifestClient;

    adapter = new CapacitorUpdaterAdapter(mockManifestClient, mockPlugin);
  });

  it('detects native Android app info when running on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    const info = await adapter.getInstalledAppInfo();
    expect(info.isNative).toBe(true);
    expect(info.platform).toBe('android');
    expect(info.version).toBe('1.2.0');
    expect(info.build).toBe(120);
    expect(info.serverBasePath).toBe('/data/user/0/ai.pixelforge/updates/1.2.0');
  });

  it('uses fallback values when native plugin returns empty version or 0 build', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    mockPlugin.getAppInfo = vi.fn().mockResolvedValue({
      versionName: '',
      versionCode: 0,
      packageName: 'ai.pixelforge.virtualcreatures',
      currentServerBasePath: null
    });

    const info = await adapter.getInstalledAppInfo();
    expect(info.version).toBe(APP_CONFIG.version);
    expect(info.build).toBe(100);
    expect(info.serverBasePath).toBeUndefined();
  });

  it('can be instantiated with default constructor arguments', () => {
    const defaultAdapter = new CapacitorUpdaterAdapter();
    expect(defaultAdapter).toBeDefined();
  });

  it('handles download methods without onProgress callback', async () => {
    const webRes = await adapter.downloadAndExtractWebBundle(
      'https://test.com/bundle.zip',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '1.2.0'
    );
    expect(webRes).toBe(true);

    const apkRes = await adapter.downloadAndRequestApkInstall(
      'https://test.com/app.apk',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '1.2.0'
    );
    expect(apkRes).toBe(true);
  });

  it('handles reloadApp when window.location is absent', () => {
    const originalLocation = window.location;
    try {
      Object.defineProperty(window, 'location', {
        value: undefined,
        configurable: true,
        writable: true
      });
      expect(() => adapter.reloadApp()).not.toThrow();
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true
      });
    }
  });

  it('detects web app info when not running on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    const info = await adapter.getInstalledAppInfo();
    expect(info.isNative).toBe(false);
    expect(info.platform).toBe('web');
    expect(info.version).toBe(APP_CONFIG.version);
  });

  it('delegates fetchRemoteManifest to HttpManifestClient', async () => {
    const manifest = await adapter.fetchRemoteManifest('https://test.com/version.json', 3000);
    expect(manifest.version).toBe('1.2.0');
    expect(mockManifestClient.fetchManifest).toHaveBeenCalledWith(
      'https://test.com/version.json',
      3000
    );
  });

  it('handles downloadAndExtractWebBundle with progress notifications', async () => {
    const progressCalls: number[] = [];
    const res = await adapter.downloadAndExtractWebBundle(
      'https://test.com/bundle.zip',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '1.2.0',
      (p) => progressCalls.push(p.percent)
    );

    expect(res).toBe(true);
    expect(progressCalls).toEqual([10, 100]);
    expect(mockPlugin.downloadAndExtractWebBundle).toHaveBeenCalledWith({
      bundleUrl: 'https://test.com/bundle.zip',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      version: '1.2.0'
    });
  });

  it('handles downloadAndRequestApkInstall with progress notifications', async () => {
    const progressCalls: number[] = [];
    const res = await adapter.downloadAndRequestApkInstall(
      'https://test.com/app.apk',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      '1.2.0',
      (p) => progressCalls.push(p.percent)
    );

    expect(res).toBe(true);
    expect(progressCalls).toEqual([10, 100]);
    expect(mockPlugin.downloadAndInstallApk).toHaveBeenCalledWith({
      apkUrl: 'https://test.com/app.apk',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      version: '1.2.0'
    });
  });

  it('handles resetToBundledVersion and reloadApp', async () => {
    await adapter.resetToBundledVersion();
    expect(mockPlugin.resetToBundledVersion).toHaveBeenCalled();

    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true
    });

    adapter.reloadApp();
    expect(reloadMock).toHaveBeenCalled();
  });

  it('exercises NativeAppUpdater web fallback implementation directly', async () => {
    const info = await NativeAppUpdater.getAppInfo();
    expect(info.versionName).toBe(APP_CONFIG.version);
    expect(info.currentServerBasePath).toBeNull();

    const webBundle = await NativeAppUpdater.downloadAndExtractWebBundle({
      bundleUrl: '',
      checksum: '',
      version: '1.0.0'
    });
    expect(webBundle.success).toBe(true);

    const apk = await NativeAppUpdater.downloadAndInstallApk({
      apkUrl: '',
      checksum: '',
      version: '1.0.0'
    });
    expect(apk.success).toBe(true);

    const reset = await NativeAppUpdater.resetToBundledVersion();
    expect(reset.success).toBe(true);
  });
});
