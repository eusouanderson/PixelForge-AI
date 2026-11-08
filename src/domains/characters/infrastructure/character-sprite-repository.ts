import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import { PRESETS } from '@/shared/constants/presets';
import type {
  CharacterAnimationName,
  CharacterId,
  CharacterLifeStage,
  CharacterSpriteRepositoryPort
} from '../types';
import { CHARACTER_SPECIES_REGISTRY } from '../domain/character-registry';

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
    frame: number
  ): DeclarativePixelArt {
    const frames = this.getAnimationFrames(characterId, stage, animation);
    const index = Math.max(0, Math.min(frames.length - 1, frame - 1));
    return frames[index];
  }
}
