(function (global) {
  'use strict';

  const XW = (global.XW = global.XW || {});

  // Pure-Code Web Audio Procedural Xianxia Ambient BGM Engine
  // Synthesizes Guqin/Guzheng plucks, Breathy Bamboo Xiao flute, Ethereal Cloud-Sea Pad,
  // Mountain Breeze & Jade Wind-Chimes in D-Major Pentatonic (宫商角徵羽) — 100% zero external assets!

  const MIDI_TO_HZ = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // D-Major Pentatonic poetic chord cycle: Dmaj9 -> Bm7 -> Gmaj9 -> Asus4
  const CHORDS = [
    { name: 'D',  pad: [50, 57, 62], bass: 50, arp: [50, 57, 62, 66, 69, 74] }, // D3 A3 D4 F#4 A4 D5
    { name: 'Bm', pad: [47, 54, 59], bass: 47, arp: [47, 54, 59, 62, 66, 71] }, // B2 F#3 B3 D4 F#4 B4
    { name: 'G',  pad: [43, 50, 59], bass: 43, arp: [43, 50, 55, 59, 62, 66] }, // G2 D3 G3 B3 D4 F#4
    { name: 'A',  pad: [45, 52, 59], bass: 45, arp: [45, 52, 57, 62, 64, 69] }, // A2 E3 A3 D4 E4 A4
  ];

  // Curated lyrical Xianxia Guqin / Guzheng melodic phrases (MIDI notes in D-major pentatonic, null = poetic breath)
  const GUZHENG_PHRASES = [
    [62, 66, 69, null, 74, 71, 69, null],
    [69, 71, 74, 76, null, 74, 69, 66],
    [66, 64, 62, null, 57, 62, 66, null],
    [74, null, 76, 74, 71, 69, null, 66],
    [62, 64, 66, 69, null, 66, 64, 62],
    [71, 69, 66, null, 64, 62, 59, 57],
  ];

  // Slow floating Bamboo Xiao (洞箫) counter-melodies
  const XIAO_PHRASES = [
    [
      { note: 74, dur: 2.8, gap: 0.4 },
      { note: 71, dur: 2.1, gap: 0.3 },
      { note: 69, dur: 3.4, gap: 0.5 },
    ],
    [
      { note: 69, dur: 2.2, gap: 0.35 },
      { note: 74, dur: 2.6, gap: 0.35 },
      { note: 76, dur: 2.0, gap: 0.3 },
      { note: 74, dur: 3.8, gap: 0.5 },
    ],
    [
      { note: 66, dur: 2.4, gap: 0.35 },
      { note: 69, dur: 2.2, gap: 0.35 },
      { note: 71, dur: 2.5, gap: 0.35 },
      { note: 69, dur: 3.6, gap: 0.5 },
    ],
    [
      { note: 78, dur: 2.6, gap: 0.4 },
      { note: 76, dur: 2.0, gap: 0.3 },
      { note: 74, dur: 3.8, gap: 0.6 },
    ],
  ];

  const CHIME_NOTES = [86, 88, 90, 93, 95]; // D6 E6 F#6 A6 B6

  class XianxiaAudioEngine {
    constructor() {
      this.ctx = null;
      this.started = false;
      this.muted = false;
      this.masterGain = null;
      this.musicBus = null;
      this.reverbSend = null;
      this.windGain = null;
      this.windFilter = null;
      this.noiseBuf = null;

      this.chordIdx = 0;
      this.phraseIdx = 0;
      this.stepInPhrase = 0;
      this.beatTimer = null;
      this.nextXiaoAt = 0;
      this.nextChimeAt = 0;
      this.padNodes = [];
      this.targetVolume = 0.42;

      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || !this.started) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
        } else if (!this.muted) {
          this.ctx.resume().catch(() => {});
        }
      });
    }

    _createNoiseBuffer(ctx, seconds = 2.0) {
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        // Smooth pink-ish noise (Paul Kellet's filter) for silky wind & flute breath!
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
          b6 = white * 0.115926;
        }
      }
      return buf;
    }

    // Procedurally generate a 3.4s lush mountain-valley stereo convolution reverb impulse response
    _createReverbBuffer(ctx, duration = 3.4, decay = 2.6) {
      const len = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const env = Math.pow(1.0 - t, decay) * Math.min(1.0, i / (ctx.sampleRate * 0.025));
          const n = (Math.random() * 2 - 1);
          // Progressive high-frequency air absorption along the canyon reverb tail
          const alpha = 0.24 * (1.0 - t * 0.72) + 0.03;
          lp += alpha * (n - lp);
          data[i] = lp * env * 0.85;
        }
      }
      return buf;
    }

    start() {
      if (this.started) {
        if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
          this.ctx.resume().catch(() => {});
        }
        return;
      }

      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return;

      try {
        const ctx = new AudioCtx();
        this.ctx = ctx;
        this.started = true;

        // Master Chain: MusicBus + Reverb -> Gentle Compressor -> MasterGain -> Speakers
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 18;
        compressor.ratio.value = 3.2;
        compressor.attack.value = 0.02;
        compressor.release.value = 0.25;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(this.muted ? 0.0001 : this.targetVolume, ctx.currentTime + 2.8);

        compressor.connect(masterGain);
        masterGain.connect(ctx.destination);
        this.masterGain = masterGain;

        const musicBus = ctx.createGain();
        musicBus.gain.value = 0.86;
        musicBus.connect(compressor);
        this.musicBus = musicBus;

        // Stereo Valley Convolution Reverb
        const convolver = ctx.createConvolver();
        convolver.buffer = this._createReverbBuffer(ctx, 3.4, 2.5);
        const reverbWet = ctx.createGain();
        reverbWet.gain.value = 0.56;
        const reverbSend = ctx.createGain();
        reverbSend.gain.value = 0.75;
        reverbSend.connect(convolver);
        convolver.connect(reverbWet);
        reverbWet.connect(compressor);
        this.reverbSend = reverbSend;

        // Precompute reusable pink noise buffer
        this.noiseBuf = this._createNoiseBuffer(ctx, 3.0);

        // Start gentle mountain wind ambient bed
        this._startWindBed();

        // Start soft cloud-sea pad & melodic scheduler
        this._triggerPadChord(CHORDS[0], ctx.currentTime + 0.1, 14.0);
        this.nextXiaoAt = ctx.currentTime + 5.5;
        this.nextChimeAt = ctx.currentTime + 9.0;

        // Opening welcoming arpeggio sweep (拂弦入界)
        this._playRolledArpeggio(CHORDS[0].arp, ctx.currentTime + 0.45, 0.14, 0.18);

        this._scheduleNextBeat(2600);
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (err) {
        console.warn('[青云问道] Web Audio 初始化跳过:', err);
      }
    }

    _startWindBed() {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 340;
      filter.Q.value = 1.6;

      // Subtle slow LFO breathing on wind filter
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 110;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      const gain = ctx.createGain();
      gain.gain.value = 0.11;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      gain.connect(this.reverbSend);
      src.start();

      this.windFilter = filter;
      this.windGain = gain;
    }

    // Warm ethereal cloud-sea harmonic drone pad
    _triggerPadChord(chord, startTime, duration) {
      const ctx = this.ctx;
      if (!ctx) return;

      for (let i = 0; i < chord.pad.length; i++) {
        const freq = MIDI_TO_HZ(chord.pad[i]);
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, startTime);
        osc2.frequency.setValueAtTime(freq * 1.0028, startTime); // lush micro-detune warmth

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(460, startTime);
        lp.Q.value = 0.7;

        const g = ctx.createGain();
        const peak = i === 0 ? 0.055 : 0.036;
        g.gain.setValueAtTime(0.0001, startTime);
        g.gain.linearRampToValueAtTime(peak, startTime + 3.6);
        g.gain.setValueAtTime(peak, startTime + Math.max(4.0, duration - 4.0));
        g.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        osc1.connect(lp);
        osc2.connect(lp);
        lp.connect(g);
        g.connect(this.musicBus);
        g.connect(this.reverbSend);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.1);
        osc2.stop(startTime + duration + 0.1);
      }
    }

    // Expressive Guqin / Guzheng plucked string synthesis (古琴/古筝拨弦 + 偶发滑音)
    _playPluck(midiNote, startTime, velocity = 0.22, slideFrom = null, panVal = 0.0) {
      const ctx = this.ctx;
      if (!ctx) return;

      const freq = MIDI_TO_HZ(midiNote);
      const decayDur = 3.2 + Math.max(0, (72 - midiNote) * 0.08);

      const voiceOut = ctx.createGain();
      voiceOut.gain.setValueAtTime(0.0001, startTime);
      voiceOut.gain.linearRampToValueAtTime(velocity, startTime + 0.012);
      voiceOut.gain.exponentialRampToValueAtTime(velocity * 0.34, startTime + 0.42);
      voiceOut.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDur);

      // Dynamic woody low-pass filter: crisp initial pluck mellowing into warm string resonance
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(Math.min(4200, freq * 6.5), startTime);
      lp.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.45), startTime + 1.35);
      lp.Q.value = 1.1;

      // Fundamental + 2nd & 3rd string overtones
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      const osc3 = ctx.createOscillator();
      osc3.type = 'sine';

      const g1 = ctx.createGain(); g1.gain.value = 0.68;
      const g2 = ctx.createGain(); g2.gain.value = 0.24;
      const g3 = ctx.createGain(); g3.gain.value = 0.09;

      if (slideFrom !== null) {
        const f0 = MIDI_TO_HZ(slideFrom);
        osc1.frequency.setValueAtTime(f0, startTime);
        osc1.frequency.exponentialRampToValueAtTime(freq, startTime + 0.18);
        osc2.frequency.setValueAtTime(f0 * 2, startTime);
        osc2.frequency.exponentialRampToValueAtTime(freq * 2, startTime + 0.18);
        osc3.frequency.setValueAtTime(f0 * 3, startTime);
        osc3.frequency.exponentialRampToValueAtTime(freq * 3, startTime + 0.18);
      } else {
        osc1.frequency.setValueAtTime(freq, startTime);
        osc2.frequency.setValueAtTime(freq * 2, startTime);
        osc3.frequency.setValueAtTime(freq * 3, startTime);
      }

      osc1.connect(g1); g1.connect(lp);
      osc2.connect(g2); g2.connect(lp);
      osc3.connect(g3); g3.connect(lp);

      // Brief wooden fingertip pluck transient
      if (this.noiseBuf) {
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = this.noiseBuf;
        const nFilt = ctx.createBiquadFilter();
        nFilt.type = 'bandpass';
        nFilt.frequency.value = Math.min(3400, freq * 3.0);
        nFilt.Q.value = 2.5;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(velocity * 0.45, startTime);
        nGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045);
        nSrc.connect(nFilt);
        nFilt.connect(nGain);
        nGain.connect(voiceOut);
        nSrc.start(startTime, Math.random() * 1.5, 0.06);
      }

      lp.connect(voiceOut);

      if (ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = panVal;
        voiceOut.connect(pan);
        pan.connect(this.musicBus);
        pan.connect(this.reverbSend);
      } else {
        voiceOut.connect(this.musicBus);
        voiceOut.connect(this.reverbSend);
      }

      osc1.start(startTime); osc2.start(startTime); osc3.start(startTime);
      osc1.stop(startTime + decayDur + 0.08);
      osc2.stop(startTime + decayDur + 0.08);
      osc3.stop(startTime + decayDur + 0.08);
    }

    // Flowing Guzheng rolled arpeggio sweep (古筝琶音/拂弦)
    _playRolledArpeggio(notes, startTime, stepSec = 0.11, baseVel = 0.15) {
      for (let i = 0; i < notes.length; i++) {
        const t = startTime + i * stepSec;
        const pan = -0.38 + (i / Math.max(1, notes.length - 1)) * 0.76;
        const vel = baseVel * (0.82 + 0.28 * Math.sin((i / notes.length) * Math.PI));
        this._playPluck(notes[i], t, vel, null, pan);
      }
    }

    // Breathy Bamboo Xiao Flute note (空灵洞箫)
    _playXiaoNote(midiNote, startTime, duration = 2.6, velocity = 0.11) {
      const ctx = this.ctx;
      if (!ctx) return;

      const freq = MIDI_TO_HZ(midiNote);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(velocity, startTime + Math.min(0.55, duration * 0.28));
      env.gain.setValueAtTime(velocity * 0.88, startTime + Math.max(0.6, duration - 0.95));
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      // Gentle delayed vibrato just like a live bamboo xiao player!
      const vib = ctx.createOscillator();
      vib.type = 'sine';
      vib.frequency.value = 4.5;
      const vibGain = ctx.createGain();
      vibGain.gain.setValueAtTime(0.0, startTime);
      vibGain.gain.linearRampToValueAtTime(freq * 0.0065, startTime + 0.9);
      vib.connect(vibGain);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq * 0.985, startTime);
      osc1.frequency.exponentialRampToValueAtTime(freq, startTime + 0.16);
      vibGain.connect(osc1.frequency);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, startTime);
      const g2 = ctx.createGain();
      g2.gain.value = 0.12;

      // Soft breathy embouchure air whisper tuned to the note pitch
      if (this.noiseBuf) {
        const bSrc = ctx.createBufferSource();
        bSrc.buffer = this.noiseBuf;
        bSrc.loop = true;
        const bFilt = ctx.createBiquadFilter();
        bFilt.type = 'bandpass';
        bFilt.frequency.value = freq * 2.0;
        bFilt.Q.value = 6.0;
        const bGain = ctx.createGain();
        bGain.gain.value = 0.32;
        bSrc.connect(bFilt);
        bFilt.connect(bGain);
        bGain.connect(env);
        bSrc.start(startTime, Math.random(), duration + 0.1);
      }

      osc1.connect(env);
      osc2.connect(g2);
      g2.connect(env);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2100;
      env.connect(lp);

      if (ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = -0.18;
        lp.connect(pan);
        pan.connect(this.musicBus);
        pan.connect(this.reverbSend);
      } else {
        lp.connect(this.musicBus);
        lp.connect(this.reverbSend);
      }

      vib.start(startTime);
      osc1.start(startTime);
      osc2.start(startTime);
      vib.stop(startTime + duration + 0.1);
      osc1.stop(startTime + duration + 0.1);
      osc2.stop(startTime + duration + 0.1);
    }

    // Delicate crystalline jade wind-chime sparkle (远山玉铃)
    _playJadeChime(midiNote, startTime) {
      const ctx = this.ctx;
      if (!ctx) return;
      const freq = MIDI_TO_HZ(midiNote);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, startTime);
      g.gain.linearRampToValueAtTime(0.036, startTime + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.4);

      osc.connect(g);
      if (ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() - 0.5) * 1.1;
        g.connect(pan);
        pan.connect(this.reverbSend);
      } else {
        g.connect(this.reverbSend);
      }
      osc.start(startTime);
      osc.stop(startTime + 3.5);
    }

    _scheduleNextBeat(delayMs) {
      if (this.beatTimer) clearTimeout(this.beatTimer);
      this.beatTimer = setTimeout(() => {
        this._tickComposer();
      }, delayMs);
    }

    _tickComposer() {
      if (!this.started || !this.ctx) return;
      if (document.hidden || this.ctx.state !== 'running') {
        this._scheduleNextBeat(1200);
        return;
      }

      const now = this.ctx.currentTime + 0.06;
      const chord = CHORDS[this.chordIdx];
      const phrase = GUZHENG_PHRASES[this.phraseIdx];
      const note = phrase[this.stepInPhrase];

      // On measure downbeat: refresh ethereal cloud-sea pad & low Guqin bass anchor
      if (this.stepInPhrase === 0) {
        this._triggerPadChord(chord, now, 13.5);
        if (Math.random() < 0.45) {
          this._playRolledArpeggio(chord.arp.slice(0, 4), now, 0.13, 0.14);
        } else {
          this._playPluck(chord.bass, now, 0.20, null, -0.22);
        }
      }

      // Lyrical Guqin / Guzheng melody note with subtle human rubato & occasional pitch slide
      if (note !== null) {
        const slideFrom = (Math.random() < 0.22) ? (note - 2) : null;
        const pan = (Math.random() - 0.5) * 0.58;
        const vel = 0.14 + Math.random() * 0.07;
        this._playPluck(note, now, vel, slideFrom, pan);

        // Soft fifth/octave harmonic accompaniment on select beats
        if (this.stepInPhrase === 4 && Math.random() < 0.65) {
          this._playPluck(chord.bass + 7, now + 0.03, 0.12, null, -pan * 0.6);
        }
      }

      // Intermittent floating Bamboo Xiao solo phrase every ~14–22 seconds
      if (now >= this.nextXiaoAt) {
        const xp = XIAO_PHRASES[(Math.random() * XIAO_PHRASES.length) | 0];
        let tCursor = now + 0.4;
        for (const item of xp) {
          this._playXiaoNote(item.note, tCursor, item.dur, 0.095);
          tCursor += item.dur + item.gap;
        }
        this.nextXiaoAt = tCursor + 9.0 + Math.random() * 9.0;
      }

      // Rare distant jade wind-chime shimmer
      if (now >= this.nextChimeAt) {
        const cn = CHIME_NOTES[(Math.random() * CHIME_NOTES.length) | 0];
        this._playJadeChime(cn, now + 0.2);
        if (Math.random() < 0.45) {
          const cn2 = CHIME_NOTES[(Math.random() * CHIME_NOTES.length) | 0];
          this._playJadeChime(cn2, now + 0.65);
        }
        this.nextChimeAt = now + 8.5 + Math.random() * 10.0;
      }

      // Advance phrase & chord progression smoothly
      this.stepInPhrase++;
      let nextDelayMs = 1150 + Math.random() * 480; // meditative, spacious ~50 BPM rubato
      if (this.stepInPhrase >= phrase.length) {
        this.stepInPhrase = 0;
        this.chordIdx = (this.chordIdx + 1) % CHORDS.length;
        this.phraseIdx = (this.phraseIdx + 1 + ((Math.random() * 2) | 0)) % GUZHENG_PHRASES.length;
        nextDelayMs = 2000 + Math.random() * 900; // poetic breath between phrases
      }

      this._scheduleNextBeat(nextDelayMs);
    }

    // Subtle wind-bed response to player altitude and flying speed
    update(altitude = 20, speed = 0, flying = false) {
      if (!this.started || !this.ctx || !this.windGain || !this.windFilter || this.muted) return;
      const now = this.ctx.currentTime;
      const altFactor = Math.min(1.0, Math.max(0.0, (altitude - 18) / 180));
      const spdFactor = Math.min(1.0, speed / 90);
      const targetWind = 0.09 + altFactor * 0.08 + (flying ? spdFactor * 0.12 : 0.0);
      const targetFreq = 310 + altFactor * 220 + (flying ? spdFactor * 280 : 0.0);
      this.windGain.gain.setTargetAtTime(targetWind, now, 0.35);
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.35);
    }

    setMuted(muted) {
      const targetMute = !!muted;
      if (!targetMute && !this.started) {
        this.muted = false;
        this.start();
        return this.muted;
      }
      this.muted = targetMute;
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        if (!this.muted && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
        this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0.0001 : this.targetVolume, now + 0.25);
      }
      return this.muted;
    }

    toggleMute() {
      return this.setMuted(!this.muted);
    }
  }

  XW.Audio = {
    XianxiaAudioEngine,
  };
})(window);
