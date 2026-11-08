import type {
  AppVersionManifest,
  InstalledAppInfo,
  UpdateEvaluationResult
} from '../types';
import { compareSemver, isSemverAtLeast, isSemverGreater } from './semver';

export function evaluateUpdateNecessity(
  current: InstalledAppInfo,
  manifest: AppVersionManifest
): UpdateEvaluationResult {
  // 1. Mandatory minimum version enforcement
  if (!isSemverAtLeast(current.version, manifest.minimumVersion)) {
    const isAndroidTarget = current.isNative && manifest.androidUpdate.available;
    return {
      updateType: isAndroidTarget ? 'android' : 'web',
      isMandatory: true,
      currentVersion: current.version,
      currentBuild: current.build,
      targetVersion: manifest.version,
      targetBuild: manifest.build,
      message: `Atualização mandatória: a versão instalada (${current.version}) é anterior à mínima requerida (${manifest.minimumVersion}).`,
      manifest
    };
  }

  // 2. Prevent accidental downgrade
  if (compareSemver(manifest.version, current.version) < 0) {
    return {
      updateType: 'none',
      isMandatory: false,
      currentVersion: current.version,
      currentBuild: current.build,
      message: `A versão remota (${manifest.version}) é anterior à instalada (${current.version}). Downgrade evitado.`,
      manifest
    };
  }

  // 3. Android Native APK update evaluation
  if (
    current.isNative &&
    manifest.androidUpdate.available &&
    isSemverGreater(manifest.androidUpdate.version, current.version)
  ) {
    return {
      updateType: 'android',
      isMandatory: false,
      currentVersion: current.version,
      currentBuild: current.build,
      targetVersion: manifest.androidUpdate.version,
      targetBuild: manifest.build,
      message: `Nova versão nativa Android (${manifest.androidUpdate.version}) disponível.`,
      manifest
    };
  }

  // 4. Silent Web Content OTA update evaluation
  const isWebVersionNewer = isSemverGreater(manifest.webUpdate.version, current.version);
  const isWebBuildNewer =
    manifest.webUpdate.version === current.version && manifest.build > current.build;

  if (manifest.webUpdate.available && (isWebVersionNewer || isWebBuildNewer)) {
    return {
      updateType: 'web',
      isMandatory: false,
      currentVersion: current.version,
      currentBuild: current.build,
      targetVersion: manifest.webUpdate.version,
      targetBuild: manifest.build,
      message: `Atualização silenciosa de conteúdo web disponível (${manifest.webUpdate.version} build ${manifest.build}).`,
      manifest
    };
  }

  // 5. Already up to date
  return {
    updateType: 'none',
    isMandatory: false,
    currentVersion: current.version,
    currentBuild: current.build,
    message: `O PixelForge AI já está atualizado (${current.version}).`,
    manifest
  };
}
