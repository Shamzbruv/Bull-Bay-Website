/**
 * Game-show SFX synthesized with the Web Audio API — no binary audio assets
 * required, so sound works out of the box. Drop real recordings into
 * public/sounds/<name>.mp3 later and swap the tone table below for
 * `new Audio(...)` playback if produced audio is preferred.
 */

export type SoundName =
  | 'intro'
  | 'countdown-tick'
  | 'countdown-go'
  | 'timer-tick'
  | 'timer-warning'
  | 'time-up'
  | 'buzz'
  | 'correct'
  | 'incorrect'
  | 'score-up'
  | 'round-transition'
  | 'winner'
  | 'tie'
  | 'click';

interface Tone {
  freq: number;
  duration: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
}

const SEQUENCES: Record<SoundName, Tone[]> = {
  intro: [
    { freq: 261, duration: 0.15, type: 'triangle' },
    { freq: 329, duration: 0.15, type: 'triangle', delay: 0.15 },
    { freq: 392, duration: 0.3, type: 'triangle', delay: 0.3 },
  ],
  'countdown-tick': [{ freq: 523, duration: 0.12, type: 'sine' }],
  'countdown-go': [
    { freq: 523, duration: 0.1, type: 'sine' },
    { freq: 784, duration: 0.35, type: 'sine', delay: 0.1 },
  ],
  'timer-tick': [{ freq: 880, duration: 0.05, type: 'sine', gain: 0.15 }],
  'timer-warning': [{ freq: 660, duration: 0.09, type: 'square', gain: 0.18 }],
  'time-up': [
    { freq: 220, duration: 0.25, type: 'sawtooth' },
    { freq: 165, duration: 0.4, type: 'sawtooth', delay: 0.2 },
  ],
  buzz: [{ freq: 300, duration: 0.18, type: 'square', gain: 0.3 }],
  correct: [
    { freq: 523, duration: 0.12, type: 'sine' },
    { freq: 659, duration: 0.12, type: 'sine', delay: 0.12 },
    { freq: 784, duration: 0.25, type: 'sine', delay: 0.24 },
  ],
  incorrect: [
    { freq: 220, duration: 0.15, type: 'sawtooth', gain: 0.25 },
    { freq: 196, duration: 0.25, type: 'sawtooth', delay: 0.15, gain: 0.25 },
  ],
  'score-up': [{ freq: 988, duration: 0.1, type: 'sine', gain: 0.2 }],
  'round-transition': [
    { freq: 392, duration: 0.2, type: 'triangle' },
    { freq: 523, duration: 0.2, type: 'triangle', delay: 0.2 },
    { freq: 659, duration: 0.35, type: 'triangle', delay: 0.4 },
  ],
  winner: [
    { freq: 523, duration: 0.15, type: 'triangle' },
    { freq: 659, duration: 0.15, type: 'triangle', delay: 0.15 },
    { freq: 784, duration: 0.15, type: 'triangle', delay: 0.3 },
    { freq: 1047, duration: 0.5, type: 'triangle', delay: 0.45 },
  ],
  tie: [
    { freq: 440, duration: 0.2, type: 'sine' },
    { freq: 440, duration: 0.2, type: 'sine', delay: 0.3 },
  ],
  click: [{ freq: 700, duration: 0.04, type: 'sine', gain: 0.12 }],
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  enabled = true;
  volume = 0.6;

  private ensureContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.masterGain) this.masterGain.gain.value = volume;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    try {
      for (const tone of SEQUENCES[name]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.type ?? 'sine';
        osc.frequency.value = tone.freq;

        const startAt = ctx.currentTime + (tone.delay ?? 0);
        const peak = tone.gain ?? 0.28;
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(peak, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + tone.duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startAt);
        osc.stop(startAt + tone.duration + 0.02);
      }
    } catch {
      // Sound is a nice-to-have; never let audio failures break the game.
    }
  }
}

export const soundManager = new SoundManager();
