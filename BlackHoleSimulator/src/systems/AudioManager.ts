import { Audio } from 'expo-av';

class AudioManagerClass {
  bgmSound: Audio.Sound | null = null;
  sfxSounds: Map<string, Audio.Sound> = new Map();
  bgmEnabled: boolean = true;
  sfxEnabled: boolean = true;

  async init() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });
  }

  async playBGM() {
    if (!this.bgmEnabled || this.bgmSound) return;
  }

  async stopBGM() {
    if (this.bgmSound) {
      await this.bgmSound.stopAsync();
      await this.bgmSound.unloadAsync();
      this.bgmSound = null;
    }
  }

  async playSFX(sfxType: 'absorb' | 'levelup' | 'death' | 'win') {
    if (!this.sfxEnabled) return;
    try {
      const freqs: Record<string, number[]> = {
        absorb: [440, 550, 660],
        levelup: [523, 659, 784, 1047],
        death: [400, 300, 200],
        win: [523, 659, 784, 1047, 1319],
      };
      const notes = freqs[sfxType] || freqs.absorb;
      for (let i = 0; i < notes.length; i++) {
        setTimeout(() => {}, 0);
      }
    } catch (e) {
    }
  }

  setBGMEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBGM();
    }
  }

  setSFXEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  async cleanup() {
    await this.stopBGM();
    for (const sound of this.sfxSounds.values()) {
      await sound.unloadAsync();
    }
    this.sfxSounds.clear();
  }
}

export const AudioManager = new AudioManagerClass();