import { z } from 'zod';
import type { AppVersionManifest } from '../types';

const semverRegex = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const sha256Regex = /^[a-fA-F0-9]{64}$/;

export const WebUpdateSchema = z.object({
  available: z.boolean(),
  version: z.string().regex(semverRegex, 'Formato semver inválido em webUpdate.version'),
  bundleUrl: z.string().url('bundleUrl deve ser uma URL válida'),
  checksum: z.string().regex(sha256Regex, 'Checksum deve ser hash SHA-256 de 64 caracteres hexadecimais'),
  sizeBytes: z.number().nonnegative().optional()
});

export const AndroidUpdateSchema = z.object({
  available: z.boolean(),
  version: z.string().regex(semverRegex, 'Formato semver inválido em androidUpdate.version'),
  apkUrl: z.string().url('apkUrl deve ser uma URL válida'),
  checksum: z.string().regex(sha256Regex, 'Checksum deve ser hash SHA-256 de 64 caracteres hexadecimais'),
  sizeBytes: z.number().nonnegative().optional()
});

export const AppVersionManifestSchema = z.object({
  version: z.string().regex(semverRegex, 'Formato semver inválido na versão principal'),
  build: z.number().int().positive('Número de build deve ser um inteiro positivo'),
  minimumVersion: z.string().regex(semverRegex, 'Formato semver inválido em minimumVersion'),
  releaseDate: z.string().min(8, 'Data de release inválida'),
  changelog: z.array(z.string().min(1)).min(1, 'Changelog deve conter ao menos 1 item'),
  webUpdate: WebUpdateSchema,
  androidUpdate: AndroidUpdateSchema
});

export function parseAndValidateManifest(raw: unknown): AppVersionManifest {
  return AppVersionManifestSchema.parse(raw);
}
