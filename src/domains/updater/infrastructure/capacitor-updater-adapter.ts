import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
  AppUpdaterPort,
  AppVersionManifest,
  InstalledAppInfo,
  UpdateDownloadProgress
} from '../types';
import { HttpManifestClient } from './http-manifest-client';
import { APP_CONFIG } from '@/shared/constants/app-config';

export interface AppUpdaterNativePlugin {
  getAppInfo(): Promise<{
    versionName: string;
    versionCode: number;
    packageName: string;
    currentServerBasePath: string | null;
  }>;
  downloadAndExtractWebBundle(options: {
    bundleUrl: string;
    checksum: string;
    version: string;
  }): Promise<{ success: boolean; path: string }>;
  downloadAndInstallApk(options: {
    apkUrl: string;
    checksum: string;
    version: string;
  }): Promise<{ success: boolean; path: string }>;
  resetToBundledVersion(): Promise<{ success: boolean }>;
}

export const NativeAppUpdater = registerPlugin<AppUpdaterNativePlugin>('AppUpdater', {
  web: () => ({
    getAppInfo: async () => ({
      versionName: APP_CONFIG.version,
      versionCode: 100,
      packageName: 'ai.pixelforge.virtualcreatures',
      currentServerBasePath: null
    }),
    downloadAndExtractWebBundle: async () => ({ success: true, path: '' }),
    downloadAndInstallApk: async () => ({ success: true, path: '' }),
    resetToBundledVersion: async () => ({ success: true })
  })
});

export class CapacitorUpdaterAdapter implements AppUpdaterPort {
  private readonly manifestClient: HttpManifestClient;
  private readonly nativePlugin: AppUpdaterNativePlugin;

  constructor(
    manifestClient: HttpManifestClient = new HttpManifestClient(),
    nativePlugin: AppUpdaterNativePlugin = NativeAppUpdater
  ) {
    this.manifestClient = manifestClient;
    this.nativePlugin = nativePlugin;
  }

  public async getInstalledAppInfo(): Promise<InstalledAppInfo> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const info = await this.nativePlugin.getAppInfo();
        return {
          version: info.versionName || APP_CONFIG.version,
          build: info.versionCode || 100,
          platform: 'android',
          isNative: true,
          serverBasePath: info.currentServerBasePath ?? undefined
        };
      } catch {
        // Fallback to static app config
      }
    }

    return {
      version: APP_CONFIG.version,
      build: 100,
      platform: 'web',
      isNative: false
    };
  }

  public async fetchRemoteManifest(
    url?: string,
    timeoutMs?: number
  ): Promise<AppVersionManifest> {
    return this.manifestClient.fetchManifest(url, timeoutMs);
  }

  public async downloadAndExtractWebBundle(
    bundleUrl: string,
    expectedChecksum: string,
    version: string,
    onProgress?: (progress: UpdateDownloadProgress) => void
  ): Promise<boolean> {
    onProgress?.({ percent: 10, bytesReceived: 0, totalBytes: 100 });

    const res = await this.nativePlugin.downloadAndExtractWebBundle({
      bundleUrl,
      checksum: expectedChecksum,
      version
    });

    onProgress?.({ percent: 100, bytesReceived: 100, totalBytes: 100 });
    return res.success;
  }

  public async downloadAndRequestApkInstall(
    apkUrl: string,
    expectedChecksum: string,
    version: string,
    onProgress?: (progress: UpdateDownloadProgress) => void
  ): Promise<boolean> {
    onProgress?.({ percent: 10, bytesReceived: 0, totalBytes: 100 });

    const res = await this.nativePlugin.downloadAndInstallApk({
      apkUrl,
      checksum: expectedChecksum,
      version
    });

    onProgress?.({ percent: 100, bytesReceived: 100, totalBytes: 100 });
    return res.success;
  }

  public async resetToBundledVersion(): Promise<void> {
    await this.nativePlugin.resetToBundledVersion();
  }

  public reloadApp(): void {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  }
}
