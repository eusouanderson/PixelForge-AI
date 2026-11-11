#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = resolve(process.cwd());
const PKG_PATH = join(ROOT_DIR, 'package.json');
const APP_CONFIG_PATH = join(ROOT_DIR, 'src', 'shared', 'constants', 'app-config.ts');
const BUILD_GRADLE_PATH = join(ROOT_DIR, 'android', 'app', 'build.gradle');
const PUBLIC_VERSION_PATH = join(ROOT_DIR, 'public', 'version.json');

if (!existsSync(PKG_PATH)) {
  console.error('❌ package.json não encontrado!');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
const currentVersion = pkg.version || '1.0.0';

// Parse arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const explicitTypeArg = args.find((a) => a.startsWith('--type='))?.split('=')[1];
const explicitVersionArg = args.find((a) => a.startsWith('--set-version='))?.split('=')[1];
const explicitBuildArg = args.find((a) => a.startsWith('--build='))?.split('=')[1];

function parseSemver(v) {
  const clean = v.trim().replace(/^v/i, '');
  const [core] = clean.split('-', 2);
  const parts = core ? core.split('.').map((p) => parseInt(p, 10) || 0) : [1, 0, 0];
  return {
    major: parts[0] ?? 1,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0
  };
}

function getCommitHistorySinceLastTag() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || true', { encoding: 'utf-8' }).trim();
    if (lastTag) {
      return execSync(`git log ${lastTag}..HEAD --pretty=format:"%s%n%b" 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
    }
    return execSync('git log -n 20 --pretty=format:"%s%n%b" 2>/dev/null || true', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function determineBumpType(commitsText) {
  if (explicitTypeArg && ['major', 'minor', 'patch'].includes(explicitTypeArg)) {
    return explicitTypeArg;
  }

  if (!commitsText) {
    return 'minor'; // default to minor for new feature on main
  }

  if (
    /BREAKING[ -]CHANGE/i.test(commitsText) ||
    /breaking:/i.test(commitsText) ||
    /^[a-z]+(\([a-z0-9_-]+\))?!:/im.test(commitsText)
  ) {
    return 'major';
  }

  if (
    /^[a-z]*feat(\([a-z0-9_-]+\))?:/im.test(commitsText) ||
    /\bfeature\b/i.test(commitsText)
  ) {
    return 'minor';
  }

  return 'patch';
}

const commitsText = getCommitHistorySinceLastTag();
const bumpType = determineBumpType(commitsText);

let nextVersion;
if (explicitVersionArg) {
  nextVersion = explicitVersionArg.replace(/^v/i, '');
} else {
  const { major, minor, patch } = parseSemver(currentVersion);
  if (bumpType === 'major') {
    nextVersion = `${major + 1}.0.0`;
  } else if (bumpType === 'minor') {
    nextVersion = `${major}.${minor + 1}.0`;
  } else {
    nextVersion = `${major}.${minor}.${patch + 1}`;
  }
}

const { major: nMaj, minor: nMin, patch: nPatch } = parseSemver(nextVersion);
const calculatedBuild = nMaj * 10000 + nMin * 100 + nPatch;
let commitCount = 0;
try {
  commitCount = parseInt(execSync('git rev-list --count HEAD 2>/dev/null || echo 0', { encoding: 'utf-8' }).trim(), 10) || 0;
} catch {
  commitCount = 0;
}
let currentGradleVersionCode = 0;
if (existsSync(BUILD_GRADLE_PATH)) {
  const gradleText = readFileSync(BUILD_GRADLE_PATH, 'utf-8');
  const match = gradleText.match(/versionCode\s+(\d+)/);
  if (match) {
    currentGradleVersionCode = parseInt(match[1], 10) || 0;
  }
}
const envRunNumber = parseInt(process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || '0', 10) || 0;
const nextBuild = explicitBuildArg
  ? parseInt(explicitBuildArg, 10)
  : Math.max(currentGradleVersionCode + 1, calculatedBuild, commitCount, envRunNumber);

const apkFilename = `pixelforge-virtual-creatures-v${nextVersion}.apk`;
const tagName = `v${nextVersion}`;
const releaseTitle = `PixelForge AI v${nextVersion}`;

console.log('----------------------------------------------------');
console.log(`📌 Versão Atual:      ${currentVersion}`);
console.log(`🚀 Tipo de Incremento: ${bumpType.toUpperCase()}`);
console.log(`✨ Próxima Versão:    ${nextVersion}`);
console.log(`🔢 Build Number:      ${nextBuild}`);
console.log(`📦 Nome do APK:       ${apkFilename}`);
console.log(`🏷️ Tag Git:           ${tagName}`);
console.log('----------------------------------------------------');

if (!isDryRun) {
  // 1. package.json
  pkg.version = nextVersion;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log('✔ package.json atualizado.');

  // 2. src/shared/constants/app-config.ts
  if (existsSync(APP_CONFIG_PATH)) {
    let appConfigContent = readFileSync(APP_CONFIG_PATH, 'utf-8');
    appConfigContent = appConfigContent.replace(/version:\s*'[^']*'/, `version: '${nextVersion}'`);
    writeFileSync(APP_CONFIG_PATH, appConfigContent, 'utf-8');
    console.log('✔ app-config.ts atualizado.');
  }

  // 3. android/app/build.gradle
  if (existsSync(BUILD_GRADLE_PATH)) {
    let gradleContent = readFileSync(BUILD_GRADLE_PATH, 'utf-8');
    gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${nextBuild}`);
    gradleContent = gradleContent.replace(/versionName\s+"[^"]*"/, `versionName "${nextVersion}"`);
    writeFileSync(BUILD_GRADLE_PATH, gradleContent, 'utf-8');
    console.log('✔ build.gradle atualizado.');
  }

  // 4. public/version.json
  if (existsSync(PUBLIC_VERSION_PATH)) {
    try {
      const vJson = JSON.parse(readFileSync(PUBLIC_VERSION_PATH, 'utf-8'));
      vJson.version = nextVersion;
      vJson.build = nextBuild;
      if (vJson.webUpdate) vJson.webUpdate.version = nextVersion;
      if (vJson.androidUpdate) {
        vJson.androidUpdate.version = nextVersion;
        vJson.androidUpdate.apkUrl = `https://github.com/eusouanderson/PixelForge-AI/releases/download/v${nextVersion}/${apkFilename}`;
      }
      writeFileSync(PUBLIC_VERSION_PATH, JSON.stringify(vJson, null, 2) + '\n', 'utf-8');
      console.log('✔ public/version.json atualizado.');
    } catch {
      // ignore
    }
  }
}

// Export for GitHub Actions if running inside workflow
if (process.env.GITHUB_OUTPUT) {
  const outputs = [
    `version=${nextVersion}`,
    `build=${nextBuild}`,
    `apk_name=${apkFilename}`,
    `tag_name=${tagName}`,
    `release_title=${releaseTitle}`,
    `bump_type=${bumpType}`
  ].join('\n');
  appendFileSync(process.env.GITHUB_OUTPUT, outputs + '\n', 'utf-8');
  console.log('✔ Variáveis gravadas em $GITHUB_OUTPUT para o GitHub Actions.');
}
