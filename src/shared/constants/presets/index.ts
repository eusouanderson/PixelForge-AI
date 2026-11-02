import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

export interface PresetItem {
  id: string;
  stageNumber: number;
  label: string;
  shortLabel: string;
  data: DeclarativePixelArt;
}

const jsonModules = import.meta.glob<DeclarativePixelArt>(
  '../../../../examples/**/*.json',
  { eager: true, import: 'default' }
);

const sortedEntries = Object.entries(jsonModules).sort(([pathA], [pathB]) =>
  pathA.localeCompare(pathB)
);

export const PRESETS: readonly PresetItem[] = sortedEntries.map(([path, data], index) => {
  const fileName = path.split('/').pop()?.replace('.json', '') ?? `preset-${index + 1}`;
  const stageNumber = index + 1;
  const stageName = data.metadata?.lifeStage ?? 'fase';
  const frameNum = data.metadata?.frame ?? 1;
  const creature = data.metadata?.creatureName ?? 'Criatura';
  const rawTitle = data.name.replace(new RegExp(`^${creature}\\s*[—–-]\\s*`), '');

  return {
    id: fileName,
    stageNumber,
    label: `${creature} · ${rawTitle}`,
    shortLabel: `${stageName.charAt(0).toUpperCase() + stageName.slice(1)} ${frameNum}`,
    data
  };
});

export const stage1EggIntactPreset: DeclarativePixelArt = PRESETS[0]?.data;
export const stage2EggCrackingPreset: DeclarativePixelArt = PRESETS[1]?.data;
export const stage3EggFracturingPreset: DeclarativePixelArt = PRESETS[2]?.data;
export const stage4EggHatchingPreset: DeclarativePixelArt = PRESETS[3]?.data;
export const stage5BabyIdle1Preset: DeclarativePixelArt = PRESETS[4]?.data;
export const stage6BabyIdle2Preset: DeclarativePixelArt = PRESETS[5]?.data;
