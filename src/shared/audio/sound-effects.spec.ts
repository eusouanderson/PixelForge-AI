import { describe, it, expect, vi, afterEach } from 'vitest';
import { playSoundEffect } from './sound-effects';

describe('Sound Effects Service', () => {
  const originalAudio = globalThis.Audio;

  afterEach(() => {
    globalThis.Audio = originalAudio;
    vi.restoreAllMocks();
  });

  it('instantiates and plays sound effect with bounded volume', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    let createdSrc = '';
    let setVolume = 0;

    class MockAudio {
      public src: string;
      public volume: number = 1;
      constructor(src: string) {
        this.src = src;
        createdSrc = src;
      }
      play() {
        setVolume = this.volume;
        return playMock();
      }
    }

    globalThis.Audio = MockAudio as unknown as typeof Audio;

    playSoundEffect('eat', 0.7);
    expect(createdSrc).toBe('/sounds/eat.mp3');
    expect(setVolume).toBe(0.7);
    expect(playMock).toHaveBeenCalled();
  });

  it('clamps volume between 0 and 1', () => {
    let capturedVolume = 0;

    class MockAudio {
      public src: string;
      public volume: number = 1;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        capturedVolume = this.volume;
        return Promise.resolve();
      }
    }

    globalThis.Audio = MockAudio as unknown as typeof Audio;

    playSoundEffect('happy', 1.5);
    expect(capturedVolume).toBe(1);

    playSoundEffect('dead', -0.5);
    expect(capturedVolume).toBe(0);
  });

  it('catches and ignores rejection from audio.play()', async () => {
    class MockAudio {
      play() {
        return Promise.reject(new Error('Autoplay blocked'));
      }
    }

    globalThis.Audio = MockAudio as unknown as typeof Audio;
    expect(() => playSoundEffect('burp')).not.toThrow();
  });

  it('handles environment where Audio is undefined or throws gracefully', () => {
    // @ts-expect-error test undefined Audio
    delete globalThis.Audio;
    expect(() => playSoundEffect('eat')).not.toThrow();

    class ThrowingAudio {
      constructor() {
        throw new Error('Audio disabled');
      }
    }

    globalThis.Audio = ThrowingAudio as unknown as typeof Audio;
    expect(() => playSoundEffect('eat')).not.toThrow();
  });
});
