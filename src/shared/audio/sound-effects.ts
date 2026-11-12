export type SoundEffectName =
  | 'eat'
  | 'burp'
  | 'dead'
  | 'happy'
  | 'sneezing'
  | 'snoring';

export function playSoundEffect(name: SoundEffectName, volume: number = 0.8): void {
  try {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => {
      // Audio playback might be deferred or blocked by autoplay policies
    });
  } catch {
    // Silently handle any audio instantiation error
  }
}
