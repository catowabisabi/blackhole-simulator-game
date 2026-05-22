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
    try {
      const freqs = [55, 58, 82];
      const totalDuration = 4;
      const sampleRate = 44100;
      const numSamples = sampleRate * totalDuration;
      const numChannels = 1;
      const bitsPerSample = 16;
      const dataSize = numSamples * numChannels * (bitsPerSample / 8);
      const headerSize = 44;
      const fileSize = headerSize + dataSize;
      const buffer = new ArrayBuffer(fileSize);
      const view = new DataView(buffer);
      let offset = 0;
      view.setUint8(offset++, 0x52); view.setUint8(offset++, 0x49); view.setUint8(offset++, 0x46); view.setUint8(offset++, 0x46);
      view.setUint32(offset, fileSize - 8, true); offset += 4;
      view.setUint8(offset++, 0x57); view.setUint8(offset++, 0x41); view.setUint8(offset++, 0x56); view.setUint8(offset++, 0x45);
      view.setUint8(offset++, 0x66); view.setUint8(offset++, 0x6D); view.setUint8(offset++, 0x74); view.setUint8(offset++, 0x20);
      view.setUint32(offset, 16, true); offset += 4;
      view.setUint16(offset, 1, true); offset += 2;
      view.setUint16(offset, numChannels, true); offset += 2;
      view.setUint32(offset, sampleRate, true); offset += 4;
      view.setUint32(offset, sampleRate * numChannels * (bitsPerSample / 8), true); offset += 4;
      view.setUint16(offset, numChannels * (bitsPerSample / 8), true); offset += 2;
      view.setUint16(offset, bitsPerSample, true); offset += 2;
      view.setUint8(offset++, 0x64); view.setUint8(offset++, 0x61); view.setUint8(offset++, 0x74); view.setUint8(offset++, 0x61);
      view.setUint32(offset, dataSize, true); offset += 4;
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        for (const f of freqs) { sample += Math.sin(2 * Math.PI * f * t); }
        sample = sample / freqs.length * 0.25;
        const intSample = Math.round(sample * 32767);
        view.setInt16(offset, intSample, true); offset += 2;
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
      const uri = 'data:audio/wav;base64,' + btoa(binary);
      const { sound } = await Audio.Sound.createAsync({ uri }, { isLooping: true, shouldPlay: true, volume: 0.4 });
      this.bgmSound = sound;
    } catch (e) {}
  }

  async stopBGM() {
    if (this.bgmSound) {
      await this.bgmSound.stopAsync();
      await this.bgmSound.unloadAsync();
      this.bgmSound = null;
    }
  }

  private createWavDataURI(frequency: number, durationSec: number = 0.1): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * durationSec);
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const headerSize = 44;
    const fileSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    let offset = 0;

    // RIFF chunk descriptor
    view.setUint8(offset++, 0x52); // R
    view.setUint8(offset++, 0x49); // I
    view.setUint8(offset++, 0x46); // F
    view.setUint8(offset++, 0x46); // F
    view.setUint32(offset, fileSize - 8, true); offset += 4;
    view.setUint8(offset++, 0x57); // W
    view.setUint8(offset++, 0x41); // A
    view.setUint8(offset++, 0x56); // V
    view.setUint8(offset++, 0x45); // E

    // fmt sub-chunk
    view.setUint8(offset++, 0x66); // f
    view.setUint8(offset++, 0x6D); // m
    view.setUint8(offset++, 0x74); // t
    view.setUint8(offset++, 0x20); // space
    view.setUint32(offset, 16, true); offset += 4; // sub-chunk size
    view.setUint16(offset, 1, true); offset += 2; // audio format (PCM)
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numChannels * (bitsPerSample / 8), true); offset += 4;
    view.setUint16(offset, numChannels * (bitsPerSample / 8), true); offset += 2;
    view.setUint16(offset, bitsPerSample, true); offset += 2;

    // data sub-chunk
    view.setUint8(offset++, 0x64); // d
    view.setUint8(offset++, 0x61); // a
    view.setUint8(offset++, 0x74); // t
    view.setUint8(offset++, 0x61); // a
    view.setUint32(offset, dataSize, true); offset += 4;

    // Generate sine wave samples
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      const intSample = Math.round(sample * 32767 * 0.3);
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  async playSFX(sfxType: 'absorb' | 'kill' | 'levelup' | 'death' | 'win' | 'spawn') {
    if (!this.sfxEnabled) return;
    try {
      const freqs: Record<string, number[]> = {
        absorb: [440, 550, 660],
        kill: [660, 880],
        levelup: [523, 659, 784, 1047],
        death: [400, 300, 200],
        win: [523, 659, 784, 1047, 1319],
        spawn: [220, 165, 110], // low rumble whoosh
      };
      const notes = freqs[sfxType] || freqs.absorb;
      for (let i = 0; i < notes.length; i++) {
        const uri = this.createWavDataURI(notes[i]);
        const { sound } = await Audio.Sound.createAsync({ uri });
        await sound.playAsync();
        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (_) {}
        }, 150);
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