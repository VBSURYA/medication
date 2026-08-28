// Web Audio API loud medical alarm generator and chime engine
// Implements continuous high-volume pulsing alarm loop, device vibration, and immediate stop controls.

export type AlarmVolumeLevel = 'loud' | 'standard' | 'soft';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying: boolean = false;
  private alarmLoopTimer: ReturnType<typeof setInterval> | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private volumeLevel: AlarmVolumeLevel = 'loud';
  private listeners: Set<(isPlaying: boolean) => void> = new Set();
  private autoSilenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('med_alarm_volume') as AlarmVolumeLevel | null;
      if (savedVolume === 'loud' || savedVolume === 'standard' || savedVolume === 'soft') {
        this.volumeLevel = savedVolume;
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Subscribe to alarm ringing state changes
   */
  subscribe(callback: (isPlaying: boolean) => void) {
    this.listeners.add(callback);
    callback(this.isAlarmPlaying);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.isAlarmPlaying));
  }

  /**
   * Get current ringing state
   */
  isRinging(): boolean {
    return this.isAlarmPlaying;
  }

  /**
   * Set and persist volume level
   */
  setVolumeLevel(level: AlarmVolumeLevel) {
    this.volumeLevel = level;
    if (typeof window !== 'undefined') {
      localStorage.setItem('med_alarm_volume', level);
    }
  }

  getVolumeLevel(): AlarmVolumeLevel {
    return this.volumeLevel;
  }

  private getVolumeGain(): number {
    switch (this.volumeLevel) {
      case 'loud':
        return 0.85; // High output for elderly / cross-room auditory alert
      case 'standard':
        return 0.55;
      case 'soft':
        return 0.3;
      default:
        return 0.85;
    }
  }

  /**
   * Triggers one burst of the multi-tone medical alarm cadence
   */
  private playAlarmBurst() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const masterVolume = this.getVolumeGain();
      const startTime = ctx.currentTime + 0.02;

      // Dynamics compressor prevents clipping at high volume
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, startTime);
      compressor.knee.setValueAtTime(24, startTime);
      compressor.ratio.setValueAtTime(8, startTime);
      compressor.attack.setValueAtTime(0.003, startTime);
      compressor.release.setValueAtTime(0.2, startTime);
      compressor.connect(ctx.destination);

      // Low-pass filter to smooth harsh square edges while keeping loud acoustic presence
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, startTime);
      filter.connect(compressor);

      // 3-pulse urgent medical alarm pattern:
      // Pulse 1 (A5: 880Hz + C6: 1046.5Hz) - 140ms
      // Pulse 2 (A5: 880Hz + C6: 1046.5Hz) - 140ms
      // Pulse 3 (C6: 1046.5Hz + E6: 1318.5Hz) - 220ms
      const pulses = [
        { time: 0, duration: 0.14, freqs: [880, 1046.5] },
        { time: 0.22, duration: 0.14, freqs: [880, 1046.5] },
        { time: 0.44, duration: 0.24, freqs: [1046.5, 1318.5] },
      ];

      pulses.forEach((pulse) => {
        const pulseStart = startTime + pulse.time;
        const pulseStop = pulseStart + pulse.duration;

        pulse.freqs.forEach((freq) => {
          // Primary punch oscillator (filtered square)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'square';
          osc1.frequency.setValueAtTime(freq, pulseStart);

          // Envelope: fast attack, sustained loud body, fast release
          gain1.gain.setValueAtTime(0.001, pulseStart);
          gain1.gain.linearRampToValueAtTime(masterVolume * 0.45, pulseStart + 0.015);
          gain1.gain.setValueAtTime(masterVolume * 0.45, pulseStop - 0.02);
          gain1.gain.exponentialRampToValueAtTime(0.001, pulseStop);

          osc1.connect(gain1);
          gain1.connect(filter);
          osc1.start(pulseStart);
          osc1.stop(pulseStop);

          this.activeOscillators.push(osc1);
          this.activeGains.push(gain1);

          // Harmonic sine oscillator for acoustic richness and body
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 0.5, pulseStart); // 1 octave lower

          gain2.gain.setValueAtTime(0.001, pulseStart);
          gain2.gain.linearRampToValueAtTime(masterVolume * 0.35, pulseStart + 0.015);
          gain2.gain.setValueAtTime(masterVolume * 0.35, pulseStop - 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.001, pulseStop);

          osc2.connect(gain2);
          gain2.connect(filter);
          osc2.start(pulseStart);
          osc2.stop(pulseStop);

          this.activeOscillators.push(osc2);
          this.activeGains.push(gain2);
        });
      });

      // Synchronized device vibration on supported mobile devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([140, 80, 140, 80, 240]);
        } catch {
          // Ignore vibration permission blocks
        }
      }

      // Cleanup finished oscillator references
      setTimeout(() => {
        this.activeOscillators = this.activeOscillators.slice(-12);
        this.activeGains = this.activeGains.slice(-12);
      }, 1000);
    } catch (e) {
      console.warn('[SoundManager] Audio playback error:', e);
    }
  }

  /**
   * Start a continuous, loud medical alarm loop.
   * Runs repeatedly until stopAlarm() is called by the patient or caregiver.
   */
  startLoudAlarmLoop(options?: { autoSilenceMinutes?: number }) {
    // If already ringing, don't duplicate loops
    if (this.isAlarmPlaying && this.alarmLoopTimer) {
      return;
    }

    // Ensure audio context is ready
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    this.isAlarmPlaying = true;
    this.notifyListeners();

    // Play first burst immediately
    this.playAlarmBurst();

    // Repeat every 1.5 seconds continuously
    this.alarmLoopTimer = setInterval(() => {
      if (this.isAlarmPlaying) {
        this.playAlarmBurst();
      } else {
        this.stopAlarm();
      }
    }, 1500);

    // Safety auto-silence after 10 minutes to protect device battery if unattended
    const maxMinutes = options?.autoSilenceMinutes ?? 10;
    if (this.autoSilenceTimer) clearTimeout(this.autoSilenceTimer);
    this.autoSilenceTimer = setTimeout(() => {
      if (this.isAlarmPlaying) {
        this.stopAlarm();
      }
    }, maxMinutes * 60 * 1000);
  }

  /**
   * Immediately stops the alarm, silences all audio nodes, and cancels vibration.
   */
  stopAlarm() {
    this.isAlarmPlaying = false;

    if (this.alarmLoopTimer) {
      clearInterval(this.alarmLoopTimer);
      this.alarmLoopTimer = null;
    }

    if (this.autoSilenceTimer) {
      clearTimeout(this.autoSilenceTimer);
      this.autoSilenceTimer = null;
    }

    // Immediately stop active oscillators
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.activeGains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0.0001, now);
      } catch {
        // ignore
      }
    });

    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop(now);
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });

    this.activeOscillators = [];
    this.activeGains = [];

    // Stop device vibration
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }

    this.notifyListeners();
  }

  /**
   * Play a single loud alert burst (without continuous loop)
   */
  playReminderAlert() {
    this.playAlarmBurst();
  }

  /**
   * Play pleasant confirmation chime when medication or routine is completed
   */
  playSuccessChime() {
    try {
      // If alarm was ringing, stop it
      if (this.isAlarmPlaying) {
        this.stopAlarm();
      }

      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const vol = this.getVolumeGain() * 0.4;

      // Note 1: E5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(vol, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B5
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(vol * 1.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch {
      // Audio playback fails silently
    }
  }

  /**
   * Test tone for schedule creation or test button
   */
  playTestTone() {
    this.playAlarmBurst();
  }
}

export const soundManager = new SoundManager();
