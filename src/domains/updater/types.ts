export type UpdateType = 'none' | 'web' | 'android';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'web_update_available'
  | 'downloading_web'
  | 'ready_to_reload'
  | 'native_update_required'
  | 'downloading_apk'
  | 'ready_to_install_apk'
  | 'error';

export interface WebUpdateManifest {
  readonly available: boolean;
  readonly version: string;
  readonly bundleUrl: string;
  readonly checksum: string;
  readonly sizeBytes?: number;
}

export interface AndroidUpdateManifest {
  readonly available: boolean;
  readonly version: string;
  readonly apkUrl: string;
  readonly checksum: string;
  readonly sizeBytes?: number;
}

export interface AppVersionManifest {
  readonly version: string;
  readonly build: number;
  readonly minimumVersion: string;
  readonly releaseDate: string;
  readonly changelog: readonly string[];
  readonly webUpdate: WebUpdateManifest;
  readonly androidUpdate: AndroidUpdateManifest;
}

export interface InstalledAppInfo {
  readonly version: string;
  readonly build: number;
  readonly platform: 'android' | 'web';
  readonly isNative: boolean;
  readonly serverBasePath?: string;
}

export interface UpdateEvaluationResult {
  readonly updateType: UpdateType;
  readonly isMandatory: boolean;
  readonly currentVersion: string;
  readonly currentBuild: number;
  readonly targetVersion?: string;
  readonly targetBuild?: number;
  readonly message: string;
  readonly manifest?: AppVersionManifest;
}

export interface UpdateDownloadProgress {
  readonly percent: number;
  readonly bytesReceived: number;
  readonly totalBytes: number;
}

export interface UpdaterState {
  readonly status: UpdateStatus;
  readonly installedInfo: InstalledAppInfo;
  readonly lastCheckedAtMs: number | null;
  readonly progress: number;
  readonly message: string;
  readonly availableManifest: AppVersionManifest | null;
  readonly errorMessage: string | null;
}

export interface AppUpdaterPort {
  getInstalledAppInfo(): Promise<InstalledAppInfo>;
  fetchRemoteManifest(url: string, timeoutMs?: number): Promise<AppVersionManifest>;
  downloadAndExtractWebBundle(
    bundleUrl: string,
    expectedChecksum: string,
    version: string,
    onProgress?: (progress: UpdateDownloadProgress) => void
  ): Promise<boolean>;
  downloadAndRequestApkInstall(
    apkUrl: string,
    expectedChecksum: string,
    version: string,
    onProgress?: (progress: UpdateDownloadProgress) => void
  ): Promise<boolean>;
  resetToBundledVersion(): Promise<void>;
  reloadApp(): void;
}

export type VersionBumpType = 'major' | 'minor' | 'patch';

export interface VersionBumpResult {
  readonly currentVersion: string;
  readonly nextVersion: string;
  readonly nextBuild: number;
  readonly bumpType: VersionBumpType;
  readonly apkFilename: string;
  readonly tagName: string;
  readonly releaseTitle: string;
}

