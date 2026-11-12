import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import { parseHexColor, rgbaToUint32, uint32ToRgba } from '@/core/domain/canvas/color';
import { PRESETS } from '@/shared/constants/presets';
import type {
  CharacterAnimationName,
  CharacterId,
  CharacterLifeStage,
  CharacterSpriteRepositoryPort,
  CreaturePaletteOverrides
} from '../types';
import { CHARACTER_SPECIES_REGISTRY } from '../domain/character-registry';

function scaleHexBrightness(hex: string, factor: number, blendWhiteRatio: number = 0): string {
  const { r, g, b } = parseHexColor(hex);
  const scaledR = r * factor + (255 - r * factor) * blendWhiteRatio;
  const scaledG = g * factor + (255 - g * factor) * blendWhiteRatio;
  const scaledB = b * factor + (255 - b * factor) * blendWhiteRatio;
  const rgba = uint32ToRgba(rgbaToUint32(Math.round(scaledR), Math.round(scaledG), Math.round(scaledB), 255));
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
}

/**
 * Applies inherited genetic colors onto a cloned sprite palette in memory
 * without mutating original JSON sprite presets.
 */
export function applyPaletteOverridesToSprite(
  art: DeclarativePixelArt,
  overrides?: CreaturePaletteOverrides
): DeclarativePixelArt {
  if (!overrides) {
    return art;
  }

  const nextPalette: Record<string, string> = { ...art.palette };
  const colorMap: Readonly<Record<string, string>> = {
    dino_shadow_dark: scaleHexBrightness(overrides.base, 0.5),
    dino_shadow: scaleHexBrightness(overrides.base, 0.78),
    dino_base: overrides.base,
    dino_light: scaleHexBrightness(overrides.base, 1, 0.2),
    dino_highlight: scaleHexBrightness(overrides.base, 1, 0.42),
    dino_belly_shadow: scaleHexBrightness(overrides.belly, 0.82),
    dino_belly: overrides.belly,
    dino_belly_light: scaleHexBrightness(overrides.belly, 1, 0.35),
    dino_crest_deep: scaleHexBrightness(overrides.crest, 0.55),
    dino_crest_shadow: scaleHexBrightness(overrides.crest, 0.78),
    dino_crest: overrides.crest,
    dino_crest_light: scaleHexBrightness(overrides.crest, 1, 0.25),
    dino_crest_glow: scaleHexBrightness(overrides.crest, 1, 0.5),
    dino_eye: overrides.eye
  };

  for (const [key, value] of Object.entries(colorMap)) {
    if (key in nextPalette) {
      nextPalette[key] = value;
    }
  }

  return {
    ...art,
    palette: nextPalette
  };
}

export class CharacterSpriteRepository implements CharacterSpriteRepositoryPort {
  public getAnimationFrames(
    characterId: CharacterId,
    stage: CharacterLifeStage,
    animation: CharacterAnimationName
  ): readonly DeclarativePixelArt[] {
    const species = CHARACTER_SPECIES_REGISTRY[characterId];
    const targetAnim: CharacterAnimationName =
      stage === 'ovo' ? 'eclosao' : animation === 'eclosao' ? 'idle' : animation;

    const matching = PRESETS.filter(
      (item) =>
        item.data.metadata?.creatureName === species.name &&
        item.data.metadata?.lifeStage === stage &&
        item.data.metadata?.animation === targetAnim
    );

    return matching.map((item) => item.data);
  }

  public getSpriteFrame(
    characterId: CharacterId,
    stage: CharacterLifeStage,
    animation: CharacterAnimationName,
    frame: number,
    paletteOverrides?: CreaturePaletteOverrides
  ): DeclarativePixelArt {
    const frames = this.getAnimationFrames(characterId, stage, animation);
    const index = Math.max(0, Math.min(frames.length - 1, frame - 1));
    return applyPaletteOverridesToSprite(frames[index], paletteOverrides);
  }
}
