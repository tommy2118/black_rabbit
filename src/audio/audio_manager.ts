// Using Web Audio API directly - no external dependencies needed

export type SoundEffect =
  | 'objection'
  | 'holdit'
  | 'contradiction'
  | 'wrong'
  | 'clue_found'
  | 'typewriter'
  | 'page_turn'
  | 'dramatic_hit';

export type MusicTrack =
  | 'investigation'
  | 'interrogation'
  | 'tension'
  | 'victory'
  | 'defeat';

interface AudioManagerState {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  currentTrack: MusicTrack | null;
}

// Sound effect definitions using Web Audio API generated tones
// (No external audio files needed - we synthesize everything)
class AudioManager {
  private state: AudioManagerState = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.3,
    sfxVolume: 0.5,
    currentTrack: null,
  };

  private audioContext: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private currentMusic: OscillatorNode | null = null;
  private currentMusicGain: GainNode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.audioContext.destination);
      this.musicGain.gain.value = this.state.musicVolume;
    }
    return this.audioContext;
  }

  // Generate synthetic sound effects
  playSfx(effect: SoundEffect): void {
    if (!this.state.sfxEnabled) return;

    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = this.state.sfxVolume;

    switch (effect) {
      case 'objection':
        this.playObjectionSound(ctx, gain);
        break;
      case 'holdit':
        this.playHoldItSound(ctx, gain);
        break;
      case 'contradiction':
        this.playContradictionSound(ctx, gain);
        break;
      case 'wrong':
        this.playWrongSound(ctx, gain);
        break;
      case 'clue_found':
        this.playClueFoundSound(ctx, gain);
        break;
      case 'typewriter':
        this.playTypewriterSound(ctx, gain);
        break;
      case 'page_turn':
        this.playPageTurnSound(ctx, gain);
        break;
      case 'dramatic_hit':
        this.playDramaticHitSound(ctx, gain);
        break;
    }
  }

  private playObjectionSound(ctx: AudioContext, gain: GainNode): void {
    // Dramatic brass-like hit
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(220, ctx.currentTime);
    osc2.frequency.setValueAtTime(330, ctx.currentTime);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  }

  private playHoldItSound(ctx: AudioContext, gain: GainNode): void {
    // Higher, quicker sound
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  private playContradictionSound(ctx: AudioContext, gain: GainNode): void {
    // Triumphant chord progression
    const frequencies = [261.63, 329.63, 392, 523.25]; // C major + octave
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.connect(gain);
      oscGain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
      oscGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.05 + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(oscGain);
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 0.8);
    });
  }

  private playWrongSound(ctx: AudioContext, gain: GainNode): void {
    // Buzzer sound
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  private playClueFoundSound(ctx: AudioContext, gain: GainNode): void {
    // Pleasant discovery chime
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.connect(gain);
      oscGain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      oscGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.1 + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.connect(oscGain);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + 0.6);
    });
  }

  private playTypewriterSound(ctx: AudioContext, gain: GainNode): void {
    // Click sound
    const bufferSize = ctx.sampleRate * 0.02;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    source.connect(gain);
    source.start(ctx.currentTime);
  }

  private playPageTurnSound(ctx: AudioContext, gain: GainNode): void {
    // Whoosh sound
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.Q.value = 1;

    source.connect(filter);
    filter.connect(gain);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    source.start(ctx.currentTime);
  }

  private playDramaticHitSound(ctx: AudioContext, gain: GainNode): void {
    // Deep impact
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);

    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 2);
    }
    distortion.curve = curve;

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(distortion);
    distortion.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }

  // Music control (ambient drone for atmosphere)
  playMusic(track: MusicTrack): void {
    if (!this.state.musicEnabled) return;
    if (this.state.currentTrack === track) return;

    this.stopMusic();
    this.state.currentTrack = track;

    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create ambient drone based on track
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();

    this.currentMusicGain = ctx.createGain();
    this.currentMusicGain.connect(this.musicGain!);

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 10;

    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    lfo.connect(lfoGain);

    osc1.type = 'sine';
    osc2.type = 'triangle';

    switch (track) {
      case 'investigation':
        osc1.frequency.value = 110;
        osc2.frequency.value = 165;
        this.currentMusicGain.gain.value = 0.08;
        break;
      case 'interrogation':
        osc1.frequency.value = 82.41;
        osc2.frequency.value = 123.47;
        this.currentMusicGain.gain.value = 0.1;
        break;
      case 'tension':
        osc1.frequency.value = 73.42;
        osc2.frequency.value = 77.78;
        this.currentMusicGain.gain.value = 0.12;
        break;
      case 'victory':
        osc1.frequency.value = 130.81;
        osc2.frequency.value = 196;
        this.currentMusicGain.gain.value = 0.1;
        break;
      case 'defeat':
        osc1.frequency.value = 55;
        osc2.frequency.value = 65.41;
        this.currentMusicGain.gain.value = 0.1;
        break;
    }

    lfoGain.connect(osc1.frequency);
    osc1.connect(this.currentMusicGain);
    osc2.connect(this.currentMusicGain);

    lfo.start();
    osc1.start();
    osc2.start();

    this.currentMusic = osc1;
  }

  stopMusic(): void {
    if (this.currentMusic) {
      try {
        this.currentMusic.stop();
      } catch {
        // Already stopped
      }
      this.currentMusic = null;
    }
    this.state.currentTrack = null;
  }

  toggleMusic(): boolean {
    this.state.musicEnabled = !this.state.musicEnabled;
    if (!this.state.musicEnabled) {
      this.stopMusic();
    }
    return this.state.musicEnabled;
  }

  toggleSfx(): boolean {
    this.state.sfxEnabled = !this.state.sfxEnabled;
    return this.state.sfxEnabled;
  }

  setMusicVolume(volume: number): void {
    this.state.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.state.musicVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.state.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  isMusicEnabled(): boolean {
    return this.state.musicEnabled;
  }

  isSfxEnabled(): boolean {
    return this.state.sfxEnabled;
  }
}

export const audioManager = new AudioManager();
