import type {
  AppUpdaterPort,
  AppVersionManifest,
  UpdateEvaluationResult,
  UpdaterState
} from '../types';
import { evaluateUpdateNecessity } from '../domain/updater-engine';
import { DEFAULT_MANIFEST_URL } from '../infrastructure/http-manifest-client';
import { CapacitorUpdaterAdapter } from '../infrastructure/capacitor-updater-adapter';
import { APP_CONFIG } from '@/shared/constants/app-config';

export interface UpdateManagerConfig {
  readonly manifestUrl?: string;
  readonly cooldownMs?: number;
  readonly autoDownloadWeb?: boolean;
}

export class UpdateManagerService {
  private readonly port: AppUpdaterPort;
  private readonly manifestUrl: string;
  private readonly cooldownMs: number;
  private readonly autoDownloadWeb: boolean;
  private readonly listeners: Set<(state: UpdaterState) => void> = new Set();

  private isChecking = false;
  private isDownloading = false;

  private state: UpdaterState = {
    status: 'idle',
    installedInfo: {
      version: APP_CONFIG.version,
      build: 100,
      platform: 'web',
      isNative: false
    },
    lastCheckedAtMs: null,
    progress: 0,
    message: 'Pronto',
    availableManifest: null,
    errorMessage: null
  };

  constructor(
    port: AppUpdaterPort = new CapacitorUpdaterAdapter(),
    config: UpdateManagerConfig = {}
  ) {
    this.port = port;
    this.manifestUrl = config.manifestUrl ?? DEFAULT_MANIFEST_URL;
    this.cooldownMs = config.cooldownMs ?? 60_000;
    this.autoDownloadWeb = config.autoDownloadWeb ?? true;
  }

  public getState(): UpdaterState {
    return this.state;
  }

  public subscribe(listener: (state: UpdaterState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async initialize(): Promise<UpdaterState> {
    try {
      const installedInfo = await this.port.getInstalledAppInfo();
      this.updateState({
        installedInfo,
        message: `Versão ${installedInfo.version} (${installedInfo.platform}) pronta.`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao identificar versão instalada.';
      this.updateState({ errorMessage: msg });
    }

    return this.state;
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  public async checkForUpdates(force = false): Promise<UpdateEvaluationResult> {
    const now = Date.now();

    if (!force && this.state.lastCheckedAtMs !== null) {
      const elapsed = now - this.state.lastCheckedAtMs;
      if (elapsed < this.cooldownMs) {
        return {
          updateType: 'none',
          isMandatory: false,
          currentVersion: this.state.installedInfo.version,
          currentBuild: this.state.installedInfo.build,
          message: 'Verificação em cooldown recente. Tente novamente mais tarde.',
          manifest: this.state.availableManifest ?? undefined
        };
      }
    }

    if (!this.isOnline()) {
      return {
        updateType: 'none',
        isMandatory: false,
        currentVersion: this.state.installedInfo.version,
        currentBuild: this.state.installedInfo.build,
        message: 'Dispositivo offline. Executando versão instalada.',
        manifest: this.state.availableManifest ?? undefined
      };
    }

    if (this.isChecking) {
      return {
        updateType: 'none',
        isMandatory: false,
        currentVersion: this.state.installedInfo.version,
        currentBuild: this.state.installedInfo.build,
        message: 'Verificação já em andamento.'
      };
    }

    this.isChecking = true;
    this.updateState({
      status: 'checking',
      message: 'Consultando versões remotas...',
      errorMessage: null
    });

    try {
      const manifest = await this.port.fetchRemoteManifest(this.manifestUrl);
      const evaluation = evaluateUpdateNecessity(this.state.installedInfo, manifest);

      this.updateState({
        lastCheckedAtMs: now,
        availableManifest: manifest,
        message: evaluation.message
      });

      if (evaluation.updateType === 'web') {
        if (this.autoDownloadWeb) {
          // Download in background silently
          void this.downloadWebUpdate(manifest);
        } else {
          this.updateState({ status: 'web_update_available' });
        }
      } else if (evaluation.updateType === 'android') {
        this.updateState({ status: 'native_update_required' });
      } else {
        this.updateState({ status: 'up_to_date' });
      }

      return evaluation;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha desconhecida ao verificar atualizações.';
      this.updateState({
        status: 'error',
        errorMessage: message,
        message: 'Não foi possível verificar atualizações.'
      });

      return {
        updateType: 'none',
        isMandatory: false,
        currentVersion: this.state.installedInfo.version,
        currentBuild: this.state.installedInfo.build,
        message
      };
    } finally {
      this.isChecking = false;
    }
  }

  public async downloadWebUpdate(manifest?: AppVersionManifest): Promise<boolean> {
    const targetManifest = manifest ?? this.state.availableManifest;

    if (!targetManifest || !targetManifest.webUpdate.available) {
      this.updateState({
        status: 'error',
        errorMessage: 'Nenhum manifesto de atualização web disponível.'
      });
      return false;
    }

    if (this.isDownloading) {
      return false;
    }

    this.isDownloading = true;
    this.updateState({
      status: 'downloading_web',
      progress: 0,
      message: `Baixando atualização silenciosa v${targetManifest.webUpdate.version}...`,
      errorMessage: null
    });

    try {
      const success = await this.port.downloadAndExtractWebBundle(
        targetManifest.webUpdate.bundleUrl,
        targetManifest.webUpdate.checksum,
        targetManifest.webUpdate.version,
        (progress) => {
          this.updateState({
            progress: progress.percent,
            message: `Baixando conteúdo: ${progress.percent}%`
          });
        }
      );

      if (success) {
        this.updateState({
          status: 'ready_to_reload',
          progress: 100,
          message: `Atualização v${targetManifest.webUpdate.version} pronta. Reinicie para aplicar.`
        });
        return true;
      }

      throw new Error('Falha na validação ou extração do pacote web.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao baixar pacote web.';
      this.updateState({
        status: 'error',
        progress: 0,
        errorMessage: msg,
        message: 'Falha na atualização web. A versão atual foi preservada.'
      });
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  public async downloadAndInstallApk(manifest?: AppVersionManifest): Promise<boolean> {
    const targetManifest = manifest ?? this.state.availableManifest;

    if (!targetManifest || !targetManifest.androidUpdate.available) {
      this.updateState({
        status: 'error',
        errorMessage: 'Nenhum manifesto de atualização Android disponível.'
      });
      return false;
    }

    if (this.isDownloading) {
      return false;
    }

    this.isDownloading = true;
    this.updateState({
      status: 'downloading_apk',
      progress: 0,
      message: `Baixando APK oficial v${targetManifest.androidUpdate.version}...`,
      errorMessage: null
    });

    try {
      const success = await this.port.downloadAndRequestApkInstall(
        targetManifest.androidUpdate.apkUrl,
        targetManifest.androidUpdate.checksum,
        targetManifest.androidUpdate.version,
        (progress) => {
          this.updateState({
            progress: progress.percent,
            message: `Baixando APK: ${progress.percent}%`
          });
        }
      );

      if (success) {
        this.updateState({
          status: 'ready_to_install_apk',
          progress: 100,
          message: `APK v${targetManifest.androidUpdate.version} pronto para instalação.`
        });
        return true;
      }

      throw new Error('Falha no download ou integridade do APK.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar APK.';
      this.updateState({
        status: 'error',
        progress: 0,
        errorMessage: msg,
        message: 'Falha no instalador do APK.'
      });
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  public async resetToBundledVersion(): Promise<void> {
    await this.port.resetToBundledVersion();
    this.updateState({
      message: 'Versão redefinida para os arquivos de fábrica.'
    });
  }

  public reloadApp(): void {
    this.port.reloadApp();
  }

  private updateState(partial: Partial<UpdaterState>): void {
    this.state = {
      ...this.state,
      ...partial
    };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
