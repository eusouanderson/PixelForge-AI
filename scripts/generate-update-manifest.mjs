#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';

const ROOT_DIR = resolve(process.cwd());
const PKG_PATH = join(ROOT_DIR, 'package.json');
const DIST_DIR = join(ROOT_DIR, 'dist');
const PUBLIC_DIR = join(ROOT_DIR, 'public');

if (!existsSync(PKG_PATH)) {
  console.error('❌ package.json não encontrado!');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
const version = pkg.version || '1.0.0';

// Parse semver into numeric build fallback
const [major = 1, minor = 0, patch = 0] = version.split('.').map((p) => parseInt(p, 10) || 0);
const calculatedBuild = major * 10000 + minor * 100 + patch;
const buildNumber = parseInt(process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || String(calculatedBuild), 10);

if (!existsSync(DIST_DIR)) {
  console.error('❌ Diretório dist/ não encontrado. Execute o build web antes de gerar o pacote de atualização.');
  process.exit(1);
}

const bundleZipPath = join(DIST_DIR, 'web-bundle.zip');

console.log(`📦 Gerando web-bundle.zip a partir de ${DIST_DIR}...`);
const zip = new AdmZip();

function addFilesRecursively(dir, baseDir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(baseDir, fullPath);
    // Ignore existing zips and manifests
    if (entry === 'web-bundle.zip' || entry === 'version.json' || entry === '.DS_Store') {
      continue;
    }
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      addFilesRecursively(fullPath, baseDir);
    } else {
      const content = readFileSync(fullPath);
      zip.addFile(relPath, content);
    }
  }
}

addFilesRecursively(DIST_DIR, DIST_DIR);
zip.writeZip(bundleZipPath);

const bundleBuffer = readFileSync(bundleZipPath);
const bundleSha256 = createHash('sha256').update(bundleBuffer).digest('hex');
const bundleSizeBytes = bundleBuffer.length;

console.log(`✔ web-bundle.zip gerado (${(bundleSizeBytes / 1024).toFixed(1)} KB)`);
console.log(`✔ SHA-256 Web: ${bundleSha256}`);

// Check if an APK was built to grab its actual SHA-256
let apkSha256 = '0000000000000000000000000000000000000000000000000000000000000000';
let apkSizeBytes = 0;
const possibleApkPaths = [
  join(ROOT_DIR, 'release-apk', `pixelforge-virtual-creatures-v${version}.apk`),
  join(ROOT_DIR, 'release-apk', 'app-debug.apk'),
  join(ROOT_DIR, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
];

for (const candidate of possibleApkPaths) {
  if (existsSync(candidate)) {
    const apkBuf = readFileSync(candidate);
    apkSha256 = createHash('sha256').update(apkBuf).digest('hex');
    apkSizeBytes = apkBuf.length;
    console.log(`✔ APK localizado em ${candidate}`);
    console.log(`✔ SHA-256 APK: ${apkSha256}`);
    break;
  }
}

const manifest = {
  version,
  build: buildNumber,
  minimumVersion: '1.0.0',
  releaseDate: new Date().toISOString().split('T')[0],
  changelog: [
    `PixelForge AI v${version} (Build ${buildNumber})`,
    'Sistema Inteligente de Atualização Automática (OTA Web + APK Nativo)',
    'Auditoria de integridade SHA-256 e preservação integral de dados locais',
    'Exibição visual do status e versão ativa em tempo real'
  ],
  webUpdate: {
    available: true,
    version,
    bundleUrl: 'https://eusouanderson.github.io/PixelForge-AI/web-bundle.zip',
    checksum: bundleSha256,
    sizeBytes: bundleSizeBytes
  },
  androidUpdate: {
    available: true,
    version,
    apkUrl: `https://github.com/eusouanderson/PixelForge-AI/releases/download/v${version}/pixelforge-virtual-creatures-v${version}.apk`,
    checksum: apkSha256,
    sizeBytes: apkSizeBytes
  }
};

const manifestJson = JSON.stringify(manifest, null, 2);
writeFileSync(join(DIST_DIR, 'version.json'), manifestJson, 'utf-8');

if (existsSync(PUBLIC_DIR)) {
  writeFileSync(join(PUBLIC_DIR, 'version.json'), manifestJson, 'utf-8');
}

console.log('✔ version.json gerado com sucesso em dist/ e public/!');
console.log(manifestJson);
