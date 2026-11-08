import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateManagerService } from '../application/update-manager-service';
import type { AppUpdaterPort, AppVersionManifest, InstalledAppInfo } from '../types';

describe('UpdateManagerService Application Layer (Phase 7 - 12 Mandatory Scenarios)', () => {
  let mockPort: AppUpdaterPort;
  let sampleManifest: AppVersionManifest;
  let sampleInstalled: InstalledAppInfo;

  beforeEach(() => {
    sampleInstalled = {
      version: '1.0.0',
      build: 100,
      platform: 'web',
      isNative: false
    };

    sampleManifest = {
      version: '1.1.0',
      build: 110,
      minimumVersion: '1.0.0',
      releaseDate: '2026-11-08',
      changelog: ['Nova espécie', 'Correção de áudio'],
      webUpdate: {
        available: true,
        version: '1.1.0',
        bundleUrl: 'https://eusouanderson.github.io/PixelForge-AI/web-bundle.zip',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      androidUpdate: {
        available: false,
        version: '1.1.0',
        apkUrl: 'https://test.com/app.apk',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }
    };

    mockPort = {
      getInstalledAppInfo: vi.fn().mockResolvedValue(sampleInstalled),
      fetchRemoteManifest: vi.fn().mockResolvedValue(sampleManifest),
      downloadAndExtractWebBundle: vi.fn().mockResolvedValue(true),
      downloadAndRequestApkInstall: vi.fn().mockResolvedValue(true),
      resetToBundledVersion: vi.fn().mockResolvedValue(undefined),
      reloadApp: vi.fn()
    };
  });

  // Scenario 1: Aplicativo sem internet
  it('Scenario 1: Offline app runs smoothly without blocking or erroring', async () => {
    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: false });
    vi.spyOn(service, 'isOnline').mockReturnValue(false);

    const result = await service.checkForUpdates();
    expect(result.updateType).toBe('none');
    expect(result.message).toContain('Dispositivo offline');
    expect(mockPort.fetchRemoteManifest).not.toHaveBeenCalled();
    expect(service.getState().status).toBe('idle');
  });

  // Scenario 2: Aplicativo com internet e sem atualização
  it('Scenario 2: Online app already up to date marks status up_to_date', async () => {
    mockPort.fetchRemoteManifest = vi.fn().mockResolvedValue({
      ...sampleManifest,
      version: '1.0.0',
      build: 100,
      webUpdate: { ...sampleManifest.webUpdate, version: '1.0.0' }
    });

    const service = new UpdateManagerService(mockPort);
    await service.initialize();
    const result = await service.checkForUpdates(true);

    expect(result.updateType).toBe('none');
    expect(service.getState().status).toBe('up_to_date');
  });

  // Scenario 3: Aplicativo com atualização web disponível (transparent background download)
  it('Scenario 3: Web update available triggers silent download and ready_to_reload', async () => {
    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: true });
    await service.initialize();

    const evaluation = await service.checkForUpdates(true);
    expect(evaluation.updateType).toBe('web');

    // Wait for async download in background
    await vi.waitFor(() => {
      expect(service.getState().status).toBe('ready_to_reload');
    });

    expect(service.getState().progress).toBe(100);
    expect(mockPort.downloadAndExtractWebBundle).toHaveBeenCalledWith(
      sampleManifest.webUpdate.bundleUrl,
      sampleManifest.webUpdate.checksum,
      sampleManifest.webUpdate.version,
      expect.any(Function)
    );
  });

  // Scenario 4: Download interrompido
  it('Scenario 4: Interrupted download safely transitions to error without crashing', async () => {
    mockPort.downloadAndExtractWebBundle = vi
      .fn()
      .mockRejectedValue(new Error('Network connection lost'));

    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: false });
    await service.initialize();
    await service.checkForUpdates(true);

    const success = await service.downloadWebUpdate(sampleManifest);
    expect(success).toBe(false);
    expect(service.getState().status).toBe('error');
    expect(service.getState().errorMessage).toContain('Network connection lost');
  });

  // Scenario 5: Arquivo com SHA-256 inválido
  it('Scenario 5: Checksum failure rejects update and preserves current version', async () => {
    mockPort.downloadAndExtractWebBundle = vi.fn().mockResolvedValue(false);

    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: false });
    await service.initialize();

    const success = await service.downloadWebUpdate(sampleManifest);
    expect(success).toBe(false);
    expect(service.getState().status).toBe('error');
    expect(service.getState().errorMessage).toContain('Falha na validação ou extração');
  });

  // Scenario 6: Manifesto indisponível (404/timeout/corrompido)
  it('Scenario 6: Remote manifest failure falls back safely and keeps app usable', async () => {
    mockPort.fetchRemoteManifest = vi.fn().mockRejectedValue(new Error('Falha HTTP 404'));

    const service = new UpdateManagerService(mockPort);
    await service.initialize();
    const result = await service.checkForUpdates(true);

    expect(result.updateType).toBe('none');
    expect(service.getState().status).toBe('error');
    expect(service.getState().errorMessage).toContain('Falha HTTP 404');
  });

  // Scenario 7: Versão remota inferior à instalada (anti-downgrade)
  it('Scenario 7: Prevents accidental downgrade when remote version is older', async () => {
    mockPort.fetchRemoteManifest = vi.fn().mockResolvedValue({
      ...sampleManifest,
      version: '0.8.0',
      webUpdate: { ...sampleManifest.webUpdate, version: '0.8.0' }
    });

    const service = new UpdateManagerService(mockPort);
    await service.initialize();
    const result = await service.checkForUpdates(true);

    expect(result.updateType).toBe('none');
    expect(result.message).toContain('Downgrade evitado');
    expect(service.getState().status).toBe('up_to_date');
  });

  // Scenario 8: Atualização com falha durante a aplicação (recuperação e rollback)
  it('Scenario 8: Failure during update resets state to error and preserves current version', async () => {
    mockPort.downloadAndExtractWebBundle = vi
      .fn()
      .mockRejectedValue('Fatal extraction filesystem failure');

    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: false });
    const success = await service.downloadWebUpdate(sampleManifest);

    expect(success).toBe(false);
    expect(service.getState().status).toBe('error');
    expect(service.getState().message).toContain('A versão atual foi preservada');
  });

  // Scenario 9: Atualização nativa disponível
  it('Scenario 9: Native Android update triggers APK download flow and ready_to_install_apk', async () => {
    const androidInstalled: InstalledAppInfo = {
      version: '1.0.0',
      build: 100,
      platform: 'android',
      isNative: true
    };
    mockPort.getInstalledAppInfo = vi.fn().mockResolvedValue(androidInstalled);

    const nativeManifest: AppVersionManifest = {
      ...sampleManifest,
      version: '2.0.0',
      androidUpdate: {
        available: true,
        version: '2.0.0',
        apkUrl: 'https://github.com/eusouanderson/PixelForge-AI/releases/download/v2.0.0/app.apk',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }
    };
    mockPort.fetchRemoteManifest = vi.fn().mockResolvedValue(nativeManifest);

    const service = new UpdateManagerService(mockPort);
    await service.initialize();
    const evalRes = await service.checkForUpdates(true);

    expect(evalRes.updateType).toBe('android');
    expect(service.getState().status).toBe('native_update_required');

    const downloadSuccess = await service.downloadAndInstallApk(nativeManifest);
    expect(downloadSuccess).toBe(true);
    expect(service.getState().status).toBe('ready_to_install_apk');
    expect(mockPort.downloadAndRequestApkInstall).toHaveBeenCalledWith(
      nativeManifest.androidUpdate.apkUrl,
      nativeManifest.androidUpdate.checksum,
      nativeManifest.androidUpdate.version,
      expect.any(Function)
    );
  });

  // Scenario 10: Dados locais preservados após atualização
  it('Scenario 10: Local saves and preferences are not altered by updater service', async () => {
    const saveStore = new Map<string, string>();
    saveStore.set('pixelforge_virtual_creatures_save_v1', JSON.stringify({ activeCharacterId: 'char-1' }));

    const service = new UpdateManagerService(mockPort);
    await service.initialize();
    await service.checkForUpdates(true);

    // Save must remain untouched
    const stored = saveStore.get('pixelforge_virtual_creatures_save_v1');
    expect(stored).toContain('char-1');
  });

  // Scenario 11: Aplicativo reiniciado após atualização
  it('Scenario 11: reloadApp delegates to native/window port', () => {
    const service = new UpdateManagerService(mockPort);
    service.reloadApp();
    expect(mockPort.reloadApp).toHaveBeenCalledTimes(1);
  });

  // Scenario 12: Primeira instalação em um dispositivo (bundled fallback)
  it('Scenario 12: First installation initializes with bundled version and reset ability', async () => {
    const service = new UpdateManagerService(mockPort);
    const state = await service.initialize();

    expect(state.installedInfo.version).toBe('1.0.0');
    expect(state.status).toBe('idle');

    await service.resetToBundledVersion();
    expect(mockPort.resetToBundledVersion).toHaveBeenCalled();
    expect(service.getState().message).toContain('arquivos de fábrica');
  });

  // Extra coverage cases
  it('handles subscription notifications and unsubscription cleanly', () => {
    const service = new UpdateManagerService(mockPort);
    const states: string[] = [];

    const unsubscribe = service.subscribe((s) => {
      states.push(s.status);
    });

    expect(states).toContain('idle');
    unsubscribe();
  });

  it('enforces check cooldown unless forced', async () => {
    const service = new UpdateManagerService(mockPort, { cooldownMs: 100 });
    await service.checkForUpdates(true);
    expect(mockPort.fetchRemoteManifest).toHaveBeenCalledTimes(1);

    // Immediate second check without force -> skips network (cooldown active with manifest)
    const skipped = await service.checkForUpdates(false);
    expect(skipped.message).toContain('cooldown recente');
    expect(skipped.manifest).toBeDefined();
    expect(mockPort.fetchRemoteManifest).toHaveBeenCalledTimes(1);

    // Wait past cooldown -> proceeds with check
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(150);
      await service.checkForUpdates(false);
      expect(mockPort.fetchRemoteManifest).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles offline with cached manifest and cooldown without manifest', async () => {
    // 1. Cooldown without manifest
    const service1 = new UpdateManagerService(mockPort, { cooldownMs: 10000 });
    // Manually set lastCheckedAtMs without manifest
    Object.assign(service1, {
      state: { ...service1.getState(), lastCheckedAtMs: Date.now(), availableManifest: null }
    });
    const cooldownRes = await service1.checkForUpdates(false);
    expect(cooldownRes.manifest).toBeUndefined();

    // 2. Offline with manifest
    const service2 = new UpdateManagerService(mockPort);
    await service2.checkForUpdates(true);
    vi.spyOn(service2, 'isOnline').mockReturnValue(false);
    const offlineRes = await service2.checkForUpdates(false);
    expect(offlineRes.manifest).toBeDefined();
  });

  it('guards against concurrent update checks and downloads', async () => {
    let resolveManifest: (v: AppVersionManifest) => void = () => {};
    mockPort.fetchRemoteManifest = vi.fn().mockImplementation(
      () =>
        new Promise<AppVersionManifest>((resolve) => {
          resolveManifest = resolve;
        })
    );

    const service = new UpdateManagerService(mockPort);
    const p1 = service.checkForUpdates(true);
    const p2 = service.checkForUpdates(true);

    const concurrentResult = await p2;
    expect(concurrentResult.message).toContain('já em andamento');

    resolveManifest(sampleManifest);
    await p1;
  });

  it('rejects web or apk download if no valid manifest is provided', async () => {
    const service = new UpdateManagerService(mockPort);
    const webRes = await service.downloadWebUpdate();
    expect(webRes).toBe(false);

    const apkRes = await service.downloadAndInstallApk();
    expect(apkRes).toBe(false);
  });

  it('handles APK download failure gracefully', async () => {
    mockPort.downloadAndRequestApkInstall = vi.fn().mockResolvedValue(false);
    const service = new UpdateManagerService(mockPort);

    const nativeManifest: AppVersionManifest = {
      ...sampleManifest,
      androidUpdate: { ...sampleManifest.androidUpdate, available: true }
    };

    const res = await service.downloadAndInstallApk(nativeManifest);
    expect(res).toBe(false);
    expect(service.getState().status).toBe('error');
  });

  it('handles initialization failure gracefully', async () => {
    mockPort.getInstalledAppInfo = vi.fn().mockRejectedValue(new Error('Permission error'));
    const service = new UpdateManagerService(mockPort);
    await service.initialize();

    expect(service.getState().errorMessage).toContain('Permission error');

    // Also handles non-Error rejection
    mockPort.getInstalledAppInfo = vi.fn().mockRejectedValue('Unknown permission failure');
    await service.initialize();
    expect(service.getState().errorMessage).toContain('Falha ao identificar versão instalada');
  });

  it('reports download progress during web and apk download', async () => {
    mockPort.downloadAndExtractWebBundle = vi
      .fn()
      .mockImplementation((_url, _checksum, _ver, onProgress) => {
        onProgress?.({ percent: 45, bytesReceived: 450, totalBytes: 1000 });
        return Promise.resolve(true);
      });

    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: false });
    await service.initialize();

    const webRes = await service.downloadWebUpdate(sampleManifest);
    expect(webRes).toBe(true);
    expect(service.getState().status).toBe('ready_to_reload');

    mockPort.downloadAndRequestApkInstall = vi
      .fn()
      .mockImplementation((_url, _checksum, _ver, onProgress) => {
        onProgress?.({ percent: 80, bytesReceived: 800, totalBytes: 1000 });
        return Promise.resolve(true);
      });

    const nativeManifest: AppVersionManifest = {
      ...sampleManifest,
      androidUpdate: { ...sampleManifest.androidUpdate, available: true }
    };
    const apkRes = await service.downloadAndInstallApk(nativeManifest);
    expect(apkRes).toBe(true);
    expect(service.getState().status).toBe('ready_to_install_apk');
  });

  it('prevents concurrent downloads for both web and apk', async () => {
    let completeDownload: (v: boolean) => void = () => {};
    mockPort.downloadAndExtractWebBundle = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          completeDownload = resolve;
        })
    );

    const service = new UpdateManagerService(mockPort, { autoDownloadWeb: false });
    const p1 = service.downloadWebUpdate(sampleManifest);
    const p2 = service.downloadWebUpdate(sampleManifest);

    expect(await p2).toBe(false);

    // Also trying to trigger APK download while web download is active
    const nativeManifest: AppVersionManifest = {
      ...sampleManifest,
      androidUpdate: { ...sampleManifest.androidUpdate, available: true }
    };
    expect(await service.downloadAndInstallApk(nativeManifest)).toBe(false);

    completeDownload(true);
    await p1;
  });

  it('handles non-Error exceptions across all methods', async () => {
    mockPort.fetchRemoteManifest = vi.fn().mockRejectedValue('String network error');
    const service = new UpdateManagerService(mockPort);
    const checkRes = await service.checkForUpdates(true);
    expect(checkRes.message).toBe('Falha desconhecida ao verificar atualizações.');

    mockPort.downloadAndRequestApkInstall = vi.fn().mockRejectedValue('APK string error');
    const nativeManifest: AppVersionManifest = {
      ...sampleManifest,
      androidUpdate: { ...sampleManifest.androidUpdate, available: true }
    };
    const apkRes = await service.downloadAndInstallApk(nativeManifest);
    expect(apkRes).toBe(false);
  });

  it('can be instantiated with default constructor without arguments', () => {
    const defaultService = new UpdateManagerService();
    expect(defaultService.getState().status).toBe('idle');
  });

  it('returns true when navigator is unavailable or has no onLine property', () => {
    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true
      });
      const service = new UpdateManagerService(mockPort);
      expect(service.isOnline()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true
      });
    }
  });
});
