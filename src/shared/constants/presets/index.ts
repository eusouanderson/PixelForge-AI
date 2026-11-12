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

const ANIM_ORDER: Record<string, number> = {
  eclosao: 0,
  idle: 1,
  comendo: 2,
  amando: 3,
  doente: 4,
  morte: 5,
  dormindo: 6
};

const ANIM_SHORT_LABELS: Record<string, string> = {
  eclosao: 'Eclosão',
  idle: 'Idle',
  comendo: 'Comendo',
  amando: 'Amando',
  doente: 'Doente',
  morte: 'Morte',
  dormindo: 'Dormindo'
};

const sortedEntries = Object.entries(jsonModules).sort(([pathA, dataA], [pathB, dataB]) => {
  const dirA = pathA.slice(0, pathA.lastIndexOf('/'));
  const dirB = pathB.slice(0, pathB.lastIndexOf('/'));
  if (dirA !== dirB) return dirA.localeCompare(dirB);

  const animA = ANIM_ORDER[dataA.metadata?.animation ?? ''] ?? 99;
  const animB = ANIM_ORDER[dataB.metadata?.animation ?? ''] ?? 99;
  if (animA !== animB) return animA - animB;

  return (dataA.metadata?.frame ?? 0) - (dataB.metadata?.frame ?? 0);
});

export const PRESETS: readonly PresetItem[] = sortedEntries.map(([path, data], index) => {
  const fileName = path.split('/').pop()?.replace('.json', '') ?? `preset-${index + 1}`;
  const stageNumber = index + 1;
  const stageName = data.metadata?.lifeStage ?? 'fase';
  const animName = data.metadata?.animation ?? 'idle';
  const frameNum = data.metadata?.frame ?? 1;
  const creature = data.metadata?.creatureName ?? 'Criatura';
  const rawTitle = data.name.replace(new RegExp(`^${creature}\\s*[—–-]\\s*`), '');
  const stageCap = stageName.charAt(0).toUpperCase() + stageName.slice(1);
  const animSuffix =
    animName === 'idle' || animName === 'eclosao'
      ? ''
      : ` · ${ANIM_SHORT_LABELS[animName] ?? animName}`;

  return {
    id: fileName,
    stageNumber,
    label: `${creature} · ${rawTitle}`,
    shortLabel: `${stageCap}${animSuffix} ${frameNum}`,
    data
  };
});

export const stage1EggIntactPreset: DeclarativePixelArt = PRESETS[0]?.data;
export const stage2EggCrackingPreset: DeclarativePixelArt = PRESETS[1]?.data;
export const stage3EggFracturingPreset: DeclarativePixelArt = PRESETS[2]?.data;
export const stage4EggHatchingPreset: DeclarativePixelArt = PRESETS[3]?.data;
export const stage5BabyIdle1Preset: DeclarativePixelArt = PRESETS[4]?.data;
export const stage6BabyIdle2Preset: DeclarativePixelArt = PRESETS[5]?.data;
