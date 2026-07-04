/**
 * Abyssum Audio Controller - Procedural Synthwave BGM Synthesizer
 * Built using the Web Audio API to create authentic detuned analog synthwave loops.
 * Features:
 *  - Procedural sound synthesis (zero loading time, zero remote assets needed)
 *  - Dynamics limiter for a clean, cohesive mix
 *  - Sound engines: Analog Sub-Bass, Detuned Square Arpeggiator, Dreamy Triangle Pad, FM Space Bells, Noise Drums
 *  - Delay-feedback feedback loop for spatial echo
 *  - Real-time frequency analyser support for visualizers
 */

export interface TrackInfo {
  name: string;
  bpm: number;
  genre: string;
  desc: string;
  color: string;
}

export const ABYSSUM_TRACKS: TrackInfo[] = [
  {
    name: "Neon Overdrive",
    bpm: 110,
    genre: "Action Synthwave",
    desc: "Driving detuned outrun bassline and energetic neon lead arpeggios.",
    color: "#F27D26"
  },
  {
    name: "Solar Horizon",
    bpm: 85,
    genre: "Outrun Chillwave",
    desc: "Warm analogue chords and gliding dreamy melodies over a steady pulse.",
    color: "#00FFFF"
  },
  {
    name: "Void Drift",
    bpm: 65,
    genre: "Dark Cyber Ambient",
    desc: "Spooky deep rumble, metallic cosmic bells, and sweep filters.",
    color: "#EC4899"
  }
];

class AbyssumMusicManager {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private volume = 0.4; // 0.0 to 1.0
  private isMuted = false;

  // Synthesis nodes
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Sequencer loop variables
  private nextNoteTime = 0.0;
  private currentStep = 0;
  private schedulerTimer: any = null;
  private lookahead = 40.0; // ms
  private scheduleAheadTime = 0.15; // seconds

  // Active voice tracking for smooth fadeouts
  private activeOscillators: { osc: OscillatorNode; gain: GainNode; stopTime: number }[] = [];
  private noiseBuffer: AudioBuffer | null = null;

  // Listeners for UI state updates
  private stateChangeCallbacks: (() => void)[] = [];

  constructor() {
    // Lazy initialisation of AudioContext is done on first User interaction
  }

  public subscribe(callback: () => void) {
    this.stateChangeCallbacks.push(callback);
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(c => c !== callback);
    };
  }

  private emitChange() {
    this.stateChangeCallbacks.forEach(cb => cb());
  }

  private initAudio() {
    if (this.ctx) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Setup Analyser
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Dynamics Limiter to prevent clipping
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(3, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.08, this.ctx.currentTime);

      // Warm Echo/Delay unit
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayFeedback = this.ctx.createGain();
      
      this.delayNode.delayTime.setValueAtTime(0.36, this.ctx.currentTime); // 360ms echo
      this.delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);  // feedback feedback strength

      // Wire up effects
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);

      // Wire up delay send loop
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.masterGain); // Send delay output to master

      // Create white noise buffer for drums/sweeps
      this.createNoiseBuffer();
    } catch (e) {
      console.error("Abyssum Music Synthesizer failed to init AudioContext:", e);
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public togglePlay() {
    this.initAudio();
    
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stopSequencer();
    } else {
      this.startSequencer();
    }
    this.emitChange();
  }

  public play() {
    this.initAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.isPlaying) {
      this.startSequencer();
      this.emitChange();
    }
  }

  public pause() {
    if (this.isPlaying) {
      this.stopSequencer();
      this.emitChange();
    }
  }

  public setTrack(index: number) {
    if (index < 0 || index >= ABYSSUM_TRACKS.length) return;
    const wasPlaying = this.isPlaying;
    
    this.stopSequencer();
    this.currentTrackIndex = index;
    this.currentStep = 0;

    if (wasPlaying) {
      this.startSequencer();
    }
    this.emitChange();
  }

  public nextTrack() {
    this.setTrack((this.currentTrackIndex + 1) % ABYSSUM_TRACKS.length);
  }

  public prevTrack() {
    this.setTrack((this.currentTrackIndex - 1 + ABYSSUM_TRACKS.length) % ABYSSUM_TRACKS.length);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.emitChange();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetVol = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.02);
    }
    this.emitChange();
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public getCurrentTrackIndex() {
    return this.currentTrackIndex;
  }

  public getVolume() {
    return this.volume;
  }

  public getIsMuted() {
    return this.isMuted;
  }

  public getAnalyserData(): number[] {
    if (!this.analyser) return Array(16).fill(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Convert to a neat 16-band normalized array [0.0 - 1.0] for easy visual rendering
    const bands: number[] = [];
    const step = Math.floor(dataArray.length / 16);
    for (let i = 0; i < 16; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      bands.push(sum / step / 255);
    }
    return bands;
  }

  private startSequencer() {
    if (!this.ctx) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;
    
    // Start scheduler loop
    this.schedulerTimer = setInterval(() => {
      this.schedulerLoop();
    }, this.lookahead);
  }

  private stopSequencer() {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    
    // Clean up all active oscillators with a quick release fade
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.activeOscillators.forEach(voice => {
        try {
          voice.gain.gain.cancelScheduledValues(now);
          voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
          voice.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          voice.osc.stop(now + 0.09);
        } catch (e) {
          // oscillator already stopped
        }
      });
    }
    this.activeOscillators = [];
  }

  private schedulerLoop() {
    if (!this.ctx) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    const track = ABYSSUM_TRACKS[this.currentTrackIndex];
    const secondsPerBeat = 60.0 / track.bpm;
    
    // Tick at 16th notes for fast tracks, 8th notes for slower, 4th notes for drone
    let subdiv = 4; // 16th notes
    if (this.currentTrackIndex === 1) subdiv = 2; // 8th notes
    if (this.currentTrackIndex === 2) subdiv = 1; // Quarter notes

    const stepDuration = secondsPerBeat / subdiv;
    this.nextNoteTime += stepDuration;
    
    this.currentStep = (this.currentStep + 1) % 16; // 16 step loop
  }

  private scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const trackIndex = this.currentTrackIndex;

    // Track 1: NEON OVERDRIVE (Fast outrun synthwave)
    if (trackIndex === 0) {
      // 1. Synth Kick Drum (Heavy outrun pulse on 1, 5, 9, 13)
      if (step % 4 === 0) {
        this.synthesizeKick(time);
      }

      // 2. High-Hat (Crisp noise on offbeats 2, 4, 6, 8...)
      if (step % 2 === 1) {
        this.synthesizeHihat(time, 0.015);
      }

      // 3. Driving Cyber Bassline (Every step playing driving 16th note rhythm)
      // Chords progress: Am (A1) -> C (C2) -> G (G1) -> F (F1)
      let bassFreq = 55.0; // A1
      const bar = Math.floor(step / 4);
      if (bar === 0) bassFreq = 55.0; // A1
      else if (bar === 1) bassFreq = 65.41; // C2
      else if (bar === 2) bassFreq = 49.0; // G1
      else bassFreq = 43.65; // F1

      // Introduce octaves for bouncing outrun style
      if (step % 2 === 1) {
        bassFreq *= 2.0; // octave jump
      }

      this.synthesizeBass(bassFreq, time, 0.12, 0.05);

      // 4. Arpeggiator Lead melody (Notes in Am pentatonic)
      // Step notes: A3, C4, E4, G4, A4, G4, E4, C4
      const arpNotes = [220.0, 261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 261.63];
      const arpFreq = arpNotes[step % arpNotes.length];
      
      // Sync lead synth gate rhythm: skip occasionally for syncopation
      if (step % 4 !== 2) {
        this.synthesizeLead(arpFreq, time, 0.08, 0.04);
      }
    }

    // Track 2: SOLAR HORIZON (Warm, ambient chord outrun)
    else if (trackIndex === 1) {
      // 1. Soft pulse kick drum
      if (step % 4 === 0) {
        this.synthesizeKick(time, 100, 35, 0.18, 0.03);
      }
      
      // 2. Linear snare/clap on beats 4 and 12
      if (step === 4 || step === 12) {
        this.synthesizeSnare(time, 0.12, 0.04);
      }

      // 3. Steady, warm analogue bass rhythm (every 2nd step)
      // Progression: F (43.65Hz) -> G (49Hz) -> Am (55Hz) -> Em (41.2Hz)
      let rootFreq = 55.0;
      const chordBar = Math.floor(step / 4);
      if (chordBar === 0) rootFreq = 43.65; // F1
      else if (chordBar === 1) rootFreq = 49.00; // G1
      else if (chordBar === 2) rootFreq = 55.00; // A1
      else rootFreq = 41.20; // E1

      if (step % 2 === 0) {
        this.synthesizeBass(rootFreq, time, 0.25, 0.03);
      }

      // 4. Slow chord sweeps on step 0 and 8
      if (step === 0 || step === 8) {
        // Play chord triads! (Warm triangle pads)
        const chordNotes = rootFreq === 43.65 ? [174.61, 220.00, 261.63] : // F major (F3, A3, C4)
                           rootFreq === 49.00 ? [196.00, 246.94, 293.66] : // G major (G3, B3, D4)
                           rootFreq === 55.00 ? [220.00, 261.63, 329.63] : // A minor (A3, C4, E4)
                                                [164.81, 196.00, 246.94];   // E minor (E3, G3, B3)
        
        chordNotes.forEach((freq, idx) => {
          this.synthesizeWarmPad(freq, time, 1.4, 0.015, 0.15 + idx * 0.05);
        });
      }

      // 5. Light gliding lead note (Pentatonic chime)
      if (step % 8 === 2) {
        const leadNotes = [440.0, 493.88, 523.25, 587.33, 659.25, 783.99];
        const randomNote = leadNotes[(step + 3) % leadNotes.length];
        this.synthesizeChime(randomNote, time, 0.6, 0.03);
      }
    }

    // Track 3: VOID DRIFT (Dark space drone & FM metallic bells)
    else if (trackIndex === 2) {
      // 1. Slow, deep ambient sub-bass pulse (step 0 and 8)
      if (step === 0 || step === 8) {
        this.synthesizeBass(32.70, time, 2.2, 0.06); // C1 ultra deep
        this.synthesizeBass(48.99, time, 1.8, 0.03); // G1 stabilizer
      }

      // 2. Occasional dark space wind filter sweep
      if (step === 4 || step === 12) {
        this.synthesizeWindSweep(time, 1.8, 0.012);
      }

      // 3. FM Cosmic Space Bells (Metallic ringing ringing once in a while)
      if (step === 2 || step === 10) {
        // Bell chords/intervals (detuned eerie frequency pairings)
        this.synthesizeCosmicBell(440.0, 665.0, time, 1.2, 0.04);
      }
      if (step === 6 || step === 14) {
        this.synthesizeCosmicBell(392.0, 591.0, time, 1.5, 0.03);
      }
    }
  }

  // --- SOUND SYNTHESIS ENGINES ---

  private synthesizeKick(time: number, startHz = 135, endHz = 38, duration = 0.14, gainVal = 0.12) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = "sine";
    osc.frequency.setValueAtTime(startHz, time);
    osc.frequency.exponentialRampToValueAtTime(endHz, time + duration);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.05);

    this.registerVoice(osc, gain, time + duration);
  }

  private synthesizeSnare(time: number, duration = 0.12, gainVal = 0.04) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Snare uses white noise buffer + bandpass filter + sine sweep
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1000, time);
    noiseFilter.Q.setValueAtTime(2, time);

    const noiseGain = this.ctx.createGain();
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseGain.gain.setValueAtTime(gainVal, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // Sine body thump for snare punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.linearRampToValueAtTime(100, time + 0.06);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    oscGain.gain.setValueAtTime(gainVal * 0.8, time);
    oscGain.gain.linearRampToValueAtTime(0.001, time + 0.06);

    noiseSource.start(time);
    noiseSource.stop(time + duration);
    osc.start(time);
    osc.stop(time + 0.07);
  }

  private synthesizeHihat(time: number, gainVal = 0.02) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.ctx.createGain();

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noiseSource.start(time);
    noiseSource.stop(time + 0.05);
  }

  private synthesizeBass(freq: number, time: number, duration = 0.15, gainVal = 0.05) {
    if (!this.ctx || !this.masterGain) return;

    // Bouncing outrun bassline uses two detuned sawtooth oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-7, time); // Detuned left

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(7, time); // Detuned right

    // Deep lowpass filter for sub-bass feel
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);

    this.registerVoice(osc1, gain, time + duration);
  }

  private synthesizeLead(freq: number, time: number, duration = 0.10, gainVal = 0.035) {
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    // Connect lead synthesizer output to delay send loop as well
    gain.connect(this.delayNode);

    osc.type = "square"; // Chiptune cyberpunk pulse
    osc.frequency.setValueAtTime(freq, time);

    // Responsive filter envelope
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.05);

    this.registerVoice(osc, gain, time + duration);
  }

  private synthesizeWarmPad(freq: number, time: number, duration = 1.4, gainVal = 0.012, delayFactor = 0.1) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.type = "triangle"; // Triangles are rich, warm, and analogue-sounding
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.linearRampToValueAtTime(900, time + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(250, time + duration);

    // Warm pad attack, decay, sustain, release
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.3); // Smooth attack
    gain.gain.setValueAtTime(gainVal, time + duration - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // Long release

    osc.start(time);
    osc.stop(time + duration + 0.1);

    this.registerVoice(osc, gain, time + duration);
  }

  private synthesizeChime(freq: number, time: number, duration = 0.6, gainVal = 0.02) {
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode); // Echo chime!

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.05);

    this.registerVoice(osc, gain, time + duration);
  }

  private synthesizeWindSweep(time: number, duration = 1.8, gainVal = 0.01) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.5, time);
    
    // Sweep frequency up and down for cosmic wind gust
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.linearRampToValueAtTime(1200, time + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(300, time + duration);

    const gain = this.ctx.createGain();

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noiseSource.start(time);
    noiseSource.stop(time + duration);
  }

  private synthesizeCosmicBell(carrierHz: number, modulatorHz: number, time: number, duration = 1.4, gainVal = 0.025) {
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    // Simple frequency modulation (FM) bell synthesis:
    // modulator osc -> modulator gain -> carrier frequency input -> carrier osc -> output
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modulatorGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    modulator.connect(modulatorGain);
    modulatorGain.connect(carrier.frequency); // frequency modulation trigger

    carrier.connect(carrierGain);
    carrierGain.connect(this.masterGain);
    carrierGain.connect(this.delayNode); // chime delay trigger

    // Setup carrier
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(carrierHz, time);

    // Setup modulator (creates sidebands for metallic/dissonant bell tones)
    modulator.type = "sine";
    modulator.frequency.setValueAtTime(modulatorHz, time);
    modulatorGain.gain.setValueAtTime(300, time); // FM index modulation depth

    // Bell shape: immediate attack, exponential release
    carrierGain.gain.setValueAtTime(0.001, time);
    carrierGain.gain.linearRampToValueAtTime(gainVal, time + 0.01);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    carrier.start(time);
    modulator.start(time);

    carrier.stop(time + duration + 0.1);
    modulator.stop(time + duration + 0.1);

    this.registerVoice(carrier, carrierGain, time + duration);
  }

  // --- AUDIO BOOKKEEPING ---

  private registerVoice(osc: OscillatorNode, gain: GainNode, stopTime: number) {
    this.activeOscillators.push({ osc, gain, stopTime });
    
    // Garbage collection for voices
    if (this.activeOscillators.length > 32) {
      const now = this.ctx ? this.ctx.currentTime : Date.now() / 1000;
      this.activeOscillators = this.activeOscillators.filter(v => v.stopTime > now);
    }
  }
}

// Global BGM Singleton Instance
export const AbyssumBGM = new AbyssumMusicManager();
