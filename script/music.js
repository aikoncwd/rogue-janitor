// Procedural chiptune background music (Web Audio API, no audio files).
//
// Tunes are written in a tiny step notation, one string per voice:
//   "C4" "F#3" "Bb2"  a note (name + optional #/b + octave), lasting one step
//   "~"               tie: the previous note keeps sounding one more step
//   "."               rest
//   "x" / "X"         percussion hit / accented hit (noise voices)
//   "|"               bar line, ignored (only for readability)
// Each track sets its tempo (bpm) and steps per beat; all tunes here use
// eighth-note steps (2 per beat), so one 4/4 bar is 8 tokens.
//
// Notes are scheduled with a look-ahead timer ("A Tale of Two Clocks"): a
// setTimeout tick every `interval` ms queues every step that starts before
// ctx.currentTime + lookahead on the audio clock.
var Music = {
    volume: 0.35,          // music bus gain, relative to Sfx.master
    lookahead: 0.25,       // seconds of audio scheduled ahead of currentTime
    interval: 100,         // scheduler tick, ms
    fadeTime: 0.4,         // crossfade / stop fade, seconds
    current: null,         // wanted track name (plays once audio is available)
    playing: false,        // true while the scheduler is running
    bus: null,             // music GainNode -> Sfx.master
    timer: null,
    playback: null,        // { track, gain, step, nextTime }
    parsedCache: {},
    noiseBuffer: null,

    enabled: (function () {
        try {
            return localStorage.getItem('rj-music') !== 'off';
        } catch (e) {
            return true;
        }
    })(),

    // --- notation ---------------------------------------------------------

    noteFreq: function (name) {
        let m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
        if (m == null) {
            return null;
        }
        let semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
        semis += m[2] == '#' ? 1 : m[2] == 'b' ? -1 : 0;
        let midi = 12 * (parseInt(m[3], 10) + 1) + semis;
        return 440 * Math.pow(2, (midi - 69) / 12);
    },

    // Returns one entry per step: null (rest / held), or
    // { freq, len } for a note (len in steps, ties included), or { hit, len: 1 }.
    parse: function (str) {
        let steps = [];
        let last = null;
        let tokens = (str || '').split(/[\s|]+/);
        for (let i = 0; i < tokens.length; i++) {
            let tok = tokens[i];
            if (tok == '' || tok == '|') {
                continue;
            }
            if (tok == '~') {
                if (last != null) {
                    last.len++;
                }
                steps.push(null);
            } else if (tok == '.') {
                last = null;
                steps.push(null);
            } else if (tok == 'x' || tok == 'X') {
                last = { hit: tok == 'X' ? 1 : 0.6, len: 1 };
                steps.push(last);
            } else {
                let freq = this.noteFreq(tok);
                if (freq == null) {
                    throw new Error('Music: bad token "' + tok + '"');
                }
                last = { note: tok, freq: freq, len: 1 };
                steps.push(last);
            }
        }
        return steps;
    },

    // Parsed, cached form of a track: { stepDur, length, voices: [{ cfg, steps }] }.
    parsed: function (name) {
        if (!(name in this.parsedCache)) {
            let track = this.tracks[name];
            let voices = [];
            let length = 0;
            for (let v in track.voices) {
                let cfg = track.voices[v];
                let steps = this.parse(cfg.pattern);
                if (steps.length > 0) {
                    voices.push({ name: v, cfg: cfg, steps: steps });
                    length = Math.max(length, steps.length);
                }
            }
            this.parsedCache[name] = {
                stepDur: 60 / track.bpm / (track.stepsPerBeat || 2),
                length: length,
                voices: voices,
            };
        }
        return this.parsedCache[name];
    },

    // --- public API -------------------------------------------------------

    toggle: function () {
        this.enabled = !this.enabled;
        try {
            localStorage.setItem('rj-music', this.enabled ? 'on' : 'off');
        } catch (e) {
            // storage unavailable: preference lasts for this session only
        }
        if (this.enabled) {
            this.resume();
        } else {
            this.halt();
        }
        return this.enabled;
    },

    // Plays a track by name (fades out any other one). Without audio yet the
    // name is remembered and starts on resume(). Returns false for unknown names.
    play: function (name) {
        if (!(name in this.tracks)) {
            return false;
        }
        if (this.current == name && this.playing) {
            return true;
        }
        this.current = name;
        this.start();
        return true;
    },

    stop: function () {
        this.current = null;
        this.halt();
    },

    // Call after a user gesture (e.g. right after Sfx.unlock()) to start the
    // remembered track.
    resume: function () {
        if (typeof Sfx === 'undefined') {
            return;
        }
        if (Sfx.ctx == null) {
            Sfx.unlock();
        }
        if (this.current != null && !this.playing) {
            this.start();
        }
    },

    // --- engine -----------------------------------------------------------

    audio: function () {
        if (typeof Sfx === 'undefined' || Sfx.ctx == null || Sfx.master == null) {
            return null;
        }
        return Sfx.ctx;
    },

    start: function () {
        this.halt();
        let ctx = this.audio();
        if (!this.enabled || ctx == null || this.current == null) {
            return false;
        }
        try {
            if (this.bus == null || this.bus.context_ != ctx) {
                this.bus = ctx.createGain();
                this.bus.context_ = ctx;
                this.bus.gain.value = this.volume;
                this.bus.connect(Sfx.master);
            }
            let gain = ctx.createGain();
            let t = ctx.currentTime;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.linearRampToValueAtTime(1, t + this.fadeTime);
            gain.connect(this.bus);
            this.playback = { track: this.current, gain: gain, step: 0, nextTime: t + 0.05 };
        } catch (e) {
            this.playback = null;
            return false;
        }
        this.playing = true;
        this.tick();
        return true;
    },

    // Stops the scheduler and fades out whatever is already queued.
    halt: function () {
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.playing = false;
        let pb = this.playback;
        this.playback = null;
        let ctx = this.audio();
        if (pb == null || ctx == null) {
            return;
        }
        try {
            let t = ctx.currentTime;
            if (pb.gain.gain.cancelScheduledValues) {
                pb.gain.gain.cancelScheduledValues(t);
            }
            pb.gain.gain.setTargetAtTime(0, t, this.fadeTime / 4);
            setTimeout(function () {
                try { pb.gain.disconnect(); } catch (e) { /* already gone */ }
            }, (this.fadeTime + this.lookahead) * 1000 + 200);
        } catch (e) {
            // nothing to fade
        }
    },

    tick: function () {
        this.timer = null;
        let pb = this.playback;
        let ctx = this.audio();
        if (!this.playing || pb == null || ctx == null) {
            return;
        }
        this.schedule(pb, ctx.currentTime);
        let self = this;
        this.timer = setTimeout(function () { self.tick(); }, this.interval);
    },

    // Queues every step of `pb` that starts before now + lookahead.
    schedule: function (pb, now) {
        let song = this.parsed(pb.track);
        if (pb.nextTime < now - 0.1) {
            // the timer was throttled (background tab): skip, don't burst
            pb.nextTime = now + 0.05;
        }
        let audible = this.enabled && typeof Sfx !== 'undefined' && Sfx.enabled;
        while (pb.nextTime < now + this.lookahead) {
            if (audible) {
                for (let i = 0; i < song.voices.length; i++) {
                    let v = song.voices[i];
                    let s = v.steps[pb.step % v.steps.length];
                    if (s != null) {
                        this.note(pb, v.cfg, s, pb.nextTime, s.len * song.stepDur);
                    }
                }
            }
            pb.nextTime += song.stepDur;
            pb.step = (pb.step + 1) % song.length;
        }
    },

    // Synthesizes one step of one voice at audio time `t`.
    note: function (pb, cfg, s, t, dur) {
        let ctx = Sfx.ctx;
        try {
            if (cfg.wave == 'noise') {
                this.hat(pb, cfg, s, t);
                return;
            }
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.type = cfg.wave;
            osc.frequency.setValueAtTime(s.freq, t);
            let len = Math.max(0.06, dur * 0.95);
            let attack = cfg.attack || 0.015;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.linearRampToValueAtTime(cfg.vol, t + attack);
            gain.gain.setTargetAtTime(cfg.vol * (cfg.sustain || 0.5), t + attack, len / 3);
            gain.gain.setTargetAtTime(0.0001, t + len, cfg.release || 0.06);
            let out = gain;
            if (cfg.cutoff) {
                let filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(cfg.cutoff, t);
                gain.connect(filter);
                out = filter;
            }
            osc.connect(gain);
            out.connect(pb.gain);
            osc.start(t);
            osc.stop(t + len + (cfg.release || 0.06) * 5);
        } catch (e) {
            // a failed note must never break the scheduler
        }
    },

    hat: function (pb, cfg, s, t) {
        let ctx = Sfx.ctx;
        if (this.noiseBuffer == null || this.noiseBuffer.ctx_ != ctx) {
            let len = Math.floor(ctx.sampleRate * 0.1);
            let buffer = ctx.createBuffer(1, len, ctx.sampleRate);
            let data = buffer.getChannelData(0);
            for (let i = 0; i < len; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            buffer.ctx_ = ctx;
            this.noiseBuffer = buffer;
        }
        let src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        let filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(cfg.cutoff || 7000, t);
        let gain = ctx.createGain();
        gain.gain.setValueAtTime(cfg.vol * s.hit, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(pb.gain);
        src.start(t);
        src.stop(t + 0.08);
    },

    // --- tunes (original) -------------------------------------------------

    tracks: {
        // Bouncy, slightly pompous march for the hero raids. C major, 16 bars.
        invasion: {
            bpm: 140,
            stepsPerBeat: 2,
            voices: {
                lead: {
                    wave: 'square', vol: 0.16, cutoff: 2600, sustain: 0.55,
                    pattern:
                        'G4 . C5 . E5 ~ D5 C5 | D5 ~ G4 ~ . . G4 A4 | B4 . D5 . F5 ~ E5 D5 | E5 ~ C5 ~ . . . . |' +
                        'A4 . C5 . F5 ~ E5 D5 | C5 . A4 . F4 ~ G4 A4 | G4 . B4 D5 G5 ~ F5 D5 | C5 ~ ~ ~ G4 . . . |' +
                        'E5 . E5 . D5 . C5 . | B4 ~ A4 ~ . . E4 . | F4 . A4 . C5 . F5 . | E5 ~ ~ ~ . . . . |' +
                        'D5 . D5 . C5 . B4 . | A4 ~ G4 ~ . . G4 . | A4 . B4 . C5 . D5 . | G5 ~ ~ ~ ~ ~ . .',
                },
                bass: {
                    wave: 'triangle', vol: 0.5, sustain: 0.7,
                    pattern:
                        'C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . E3 . |' +
                        'F2 . C3 . F2 . C3 . | F2 . A2 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 ~ . . |' +
                        'A2 . E3 . A2 . E3 . | A2 . E3 . A2 . G2 . | F2 . C3 . F2 . C3 . | C3 . G2 . C3 . G2 . |' +
                        'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 ~ ~ .',
                },
                hat: {
                    wave: 'noise', vol: 0.12,
                    pattern:
                        '. x . x . x . x | . x . x . x . x | . x . x . x . x | . x . x x x X . |' +
                        '. x . x . x . x | . x . x . x . x | . x . x . x . x | . x . x x x X . |' +
                        '. x . x . x . x | . x . x . x . x | . x . x . x . x | . x . x x x X . |' +
                        '. x . x . x . x | . x . x . x . x | . x . x . x . x | x x x x X . X .',
                },
            },
        },

        // Cozy lo-fi loop for the cleaning shift. F major, A-B-A' (24 bars).
        cleaning: {
            bpm: 90,
            stepsPerBeat: 2,
            voices: {
                lead: {
                    wave: 'triangle', vol: 0.3, attack: 0.03, sustain: 0.6, release: 0.12,
                    pattern:
                        // A
                        'A4 ~ ~ . C5 ~ A4 . | F4 ~ ~ ~ . . D4 F4 | D5 ~ ~ . C5 ~ Bb4 . | G4 ~ ~ ~ . . . . |' +
                        'A4 ~ ~ . C5 ~ F5 . | E5 ~ D5 ~ . . A4 . | Bb4 ~ D5 ~ C5 ~ Bb4 A4 | G4 ~ ~ ~ ~ ~ . . |' +
                        // B
                        '. . F4 G4 Bb4 ~ ~ . | C5 ~ ~ . E5 ~ D5 C5 | E5 ~ ~ ~ C5 ~ A4 . | D5 ~ ~ ~ ~ ~ . . |' +
                        '. . G4 A4 Bb4 ~ D5 . | C5 ~ ~ . G4 ~ E4 . | F4 ~ A4 ~ C5 ~ ~ . | . . . . . . . . |' +
                        // A'
                        'A4 ~ ~ . C5 ~ A4 . | F4 ~ ~ ~ . . D4 F4 | D5 ~ ~ . C5 ~ Bb4 . | G4 ~ ~ ~ . . . . |' +
                        'A4 ~ ~ . C5 ~ F5 . | E5 ~ D5 ~ . . A4 . | Bb4 ~ A4 ~ G4 ~ ~ . | E4 ~ ~ ~ G4 ~ . .',
                },
                bass: {
                    wave: 'triangle', vol: 0.45, attack: 0.02, sustain: 0.7, release: 0.1,
                    pattern:
                        'F2 ~ ~ . C3 ~ ~ . | D2 ~ ~ . A2 ~ ~ . | Bb2 ~ ~ . F2 ~ ~ . | C3 ~ ~ . G2 ~ ~ . |' +
                        'F2 ~ ~ . C3 ~ ~ . | D2 ~ ~ . A2 ~ ~ . | Bb2 ~ ~ . F2 ~ ~ . | C3 ~ ~ . G2 ~ ~ . |' +
                        'Bb2 ~ ~ . F2 ~ ~ . | C3 ~ ~ . G2 ~ ~ . | A2 ~ ~ . E2 ~ ~ . | D2 ~ ~ . A2 ~ ~ . |' +
                        'G2 ~ ~ . D3 ~ ~ . | C3 ~ ~ . G2 ~ ~ . | F2 ~ ~ . C3 ~ ~ . | F2 ~ ~ ~ ~ ~ . . |' +
                        'F2 ~ ~ . C3 ~ ~ . | D2 ~ ~ . A2 ~ ~ . | Bb2 ~ ~ . F2 ~ ~ . | C3 ~ ~ . G2 ~ ~ . |' +
                        'F2 ~ ~ . C3 ~ ~ . | D2 ~ ~ . A2 ~ ~ . | Bb2 ~ ~ . F2 ~ ~ . | C3 ~ ~ . G2 ~ ~ .',
                },
                hat: {
                    wave: 'noise', vol: 0.06, cutoff: 8000,
                    pattern:
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . . x . | . . x . . . x . | . . x . . . x . |' +
                        '. . x . . . x . | . . x . . . x . | . . x . . . x . | . . . . . . . . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x .',
                },
            },
        },

        // Calm, warm theme for the title, how-to and story screens. D major, 16 bars.
        title: {
            bpm: 84,
            stepsPerBeat: 2,
            voices: {
                lead: {
                    wave: 'triangle', vol: 0.28, attack: 0.06, sustain: 0.7, release: 0.25,
                    pattern:
                        'F#5 ~ ~ . E5 ~ D5 . | E5 ~ ~ ~ C#5 ~ A4 . | D5 ~ ~ . F#5 ~ B4 . | B4 ~ ~ ~ ~ ~ . . |' +
                        'A4 ~ D5 ~ F#5 ~ A5 . | G5 ~ F#5 ~ E5 ~ ~ . | D5 ~ B4 ~ G4 ~ B4 . | C#5 ~ ~ ~ ~ ~ . . |' +
                        'B4 ~ ~ . D5 ~ F#5 . | A5 ~ ~ . F#5 ~ C#5 . | D5 ~ ~ . B4 ~ G4 . | A4 ~ ~ ~ ~ ~ . . |' +
                        'B4 ~ D5 ~ G5 ~ F#5 . | E5 ~ ~ . C#5 ~ E5 . | D5 ~ ~ ~ ~ ~ ~ . | . . . . . . . .',
                },
                arp: {
                    wave: 'sine', vol: 0.1, attack: 0.02, sustain: 0.3, release: 0.2,
                    pattern:
                        'D4 F#4 A4 F#4 D4 F#4 A4 F#4 | C#4 E4 A4 E4 C#4 E4 A4 E4 | B3 D4 F#4 D4 B3 D4 F#4 D4 | B3 D4 G4 D4 B3 D4 G4 D4 |' +
                        'D4 F#4 A4 F#4 D4 F#4 A4 F#4 | C#4 E4 A4 E4 C#4 E4 A4 E4 | B3 D4 G4 D4 B3 D4 G4 D4 | C#4 E4 A4 E4 C#4 E4 A4 E4 |' +
                        'B3 D4 F#4 D4 B3 D4 F#4 D4 | C#4 F#4 A4 F#4 C#4 F#4 A4 F#4 | B3 D4 G4 D4 B3 D4 G4 D4 | D4 F#4 A4 F#4 D4 F#4 A4 F#4 |' +
                        'B3 D4 G4 D4 B3 D4 G4 D4 | C#4 E4 A4 E4 C#4 E4 A4 E4 | D4 F#4 A4 F#4 D4 F#4 A4 F#4 | D4 F#4 A4 D5 ~ ~ . .',
                },
                bass: {
                    wave: 'triangle', vol: 0.4, attack: 0.05, sustain: 0.8, release: 0.3,
                    pattern:
                        'D3 ~ ~ . A2 ~ ~ . | A2 ~ ~ . E3 ~ ~ . | B2 ~ ~ . F#2 ~ ~ . | G2 ~ ~ . D3 ~ ~ . |' +
                        'D3 ~ ~ . A2 ~ ~ . | A2 ~ ~ . E3 ~ ~ . | G2 ~ ~ . D3 ~ ~ . | A2 ~ ~ . E3 ~ ~ . |' +
                        'B2 ~ ~ . F#2 ~ ~ . | F#2 ~ ~ . C#3 ~ ~ . | G2 ~ ~ . D3 ~ ~ . | D3 ~ ~ . A2 ~ ~ . |' +
                        'G2 ~ ~ . D3 ~ ~ . | A2 ~ ~ . E3 ~ ~ . | D3 ~ ~ . A2 ~ ~ . | D3 ~ ~ ~ ~ ~ . .',
                },
            },
        },

        // Upbeat adventure chase for even-day raids. A minor turning to C major, 16 bars.
        invasion2: {
            bpm: 156,
            stepsPerBeat: 2,
            voices: {
                lead: {
                    wave: 'square', vol: 0.14, cutoff: 2800, sustain: 0.5,
                    pattern:
                        'A4 . A4 C5 E5 . D5 C5 | D5 . C5 A4 F4 ~ A4 . | B4 . B4 D5 G5 . F5 D5 | E5 ~ ~ . B4 . G4 B4 |' +
                        'A4 . A4 C5 E5 . A5 G5 | F5 . E5 D5 C5 ~ A4 . | G4 . B4 D5 F5 . E5 D5 | E5 ~ ~ ~ G#4 ~ B4 . |' +
                        'C5 . E5 G5 C6 ~ G5 . | B5 . G5 D5 B4 ~ D5 . | C5 . E5 A5 C6 . B5 A5 | A5 ~ F5 ~ C5 . A4 . |' +
                        'G4 . C5 E5 G5 . E5 C5 | D5 . G5 B5 D6 ~ B5 . | C6 . A5 F5 C5 . A5 C6 | B5 ~ ~ ~ G5 . D5 .',
                },
                arp: {
                    wave: 'square', vol: 0.05, cutoff: 1800, sustain: 0.3,
                    pattern:
                        'A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | G3 D4 G4 D4 G3 D4 G4 D4 | E3 B3 E4 B3 E3 B3 E4 B3 |' +
                        'A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | G3 D4 G4 D4 G3 D4 G4 D4 | E3 G#3 B3 E4 E3 G#3 B3 E4 |' +
                        'C4 G4 C5 G4 C4 G4 C5 G4 | G3 D4 G4 D4 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 |' +
                        'C4 G4 C5 G4 C4 G4 C5 G4 | G3 D4 G4 D4 G3 D4 G4 D4 | F3 C4 F4 C4 F3 C4 F4 C4 | G3 D4 G4 D4 G3 D4 G4 D4',
                },
                bass: {
                    wave: 'triangle', vol: 0.5, sustain: 0.6,
                    pattern:
                        'A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 | E2 E3 E2 E3 E2 E3 E2 E3 |' +
                        'A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 | E2 E3 E2 E3 E2 E3 E2 E3 |' +
                        'C2 C3 C2 C3 C2 C3 C2 C3 | G2 G3 G2 G3 G2 G3 G2 G3 | A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 |' +
                        'C2 C3 C2 C3 C2 C3 C2 C3 | G2 G3 G2 G3 G2 G3 G2 G3 | F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3',
                },
                drums: {
                    wave: 'noise', vol: 0.12,
                    pattern:
                        'X . x . X . x x | X . x . X . x x | X . x . X . x x | X . x . X . x x |' +
                        'X . x . X . x x | X . x . X . x x | X . x . X . x x | X x x x X x X X |' +
                        'X . x . X . x x | X . x . X . x x | X . x . X . x x | X . x . X . x x |' +
                        'X . x . X . x x | X . x . X . x x | X . x . X . x x | X x x x X x X X',
                },
            },
        },

        // Second cozy loop for even-day shifts: same calm, its own tune. G major, A-B-A' (24 bars).
        cleaning2: {
            bpm: 88,
            stepsPerBeat: 2,
            voices: {
                lead: {
                    wave: 'triangle', vol: 0.3, attack: 0.03, sustain: 0.6, release: 0.15,
                    pattern:
                        'B4 ~ ~ . D5 ~ B4 . | G4 ~ ~ ~ . . E4 G4 | E5 ~ ~ . D5 ~ C5 . | A4 ~ ~ ~ . . . . |' +
                        'B4 ~ ~ . D5 ~ G5 . | F#5 ~ E5 ~ . . B4 . | C5 ~ E5 ~ D5 ~ C5 B4 | A4 ~ ~ ~ ~ ~ . . |' +
                        '. . E4 G4 C5 ~ ~ . | D5 ~ ~ . F#5 ~ E5 D5 | F#5 ~ ~ ~ D5 ~ B4 . | E5 ~ ~ ~ ~ ~ . . |' +
                        '. . G4 A4 C5 ~ E5 . | E5 ~ ~ . C5 ~ A4 . | A4 ~ C5 ~ D5 ~ ~ . | . . . . . . . . |' +
                        'B4 ~ ~ . D5 ~ B4 . | G4 ~ ~ ~ . . E4 G4 | E5 ~ ~ . D5 ~ C5 . | A4 ~ ~ ~ . . . . |' +
                        'B4 ~ ~ . D5 ~ G5 . | F#5 ~ E5 ~ . . B4 . | C5 ~ B4 ~ A4 ~ ~ . | G4 ~ ~ ~ B4 ~ . .',
                },
                bass: {
                    wave: 'triangle', vol: 0.45, attack: 0.02, sustain: 0.7, release: 0.1,
                    pattern:
                        'G2 ~ ~ . D3 ~ ~ . | E2 ~ ~ . B2 ~ ~ . | C3 ~ ~ . G2 ~ ~ . | D3 ~ ~ . A2 ~ ~ . |' +
                        'G2 ~ ~ . D3 ~ ~ . | E2 ~ ~ . B2 ~ ~ . | A2 ~ ~ . E3 ~ ~ . | D3 ~ ~ . A2 ~ ~ . |' +
                        'C3 ~ ~ . G2 ~ ~ . | D3 ~ ~ . A2 ~ ~ . | B2 ~ ~ . F#2 ~ ~ . | E2 ~ ~ . B2 ~ ~ . |' +
                        'C3 ~ ~ . G2 ~ ~ . | A2 ~ ~ . E3 ~ ~ . | D3 ~ ~ . A2 ~ ~ . | D3 ~ ~ . A2 ~ ~ . |' +
                        'G2 ~ ~ . D3 ~ ~ . | E2 ~ ~ . B2 ~ ~ . | C3 ~ ~ . G2 ~ ~ . | D3 ~ ~ . A2 ~ ~ . |' +
                        'G2 ~ ~ . D3 ~ ~ . | E2 ~ ~ . B2 ~ ~ . | A2 ~ ~ . E3 ~ ~ . | G2 ~ ~ ~ ~ ~ . .',
                },
                hat: {
                    wave: 'noise', vol: 0.05, cutoff: 8000,
                    pattern:
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . . . . . . . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x . |' +
                        '. . x . . . x . | . . x . . x x . | . . x . . . x . | . . x . . x x .',
                },
            },
        },

        // Music-box lullaby for the black night / end-of-day screens. A minor.
        night: {
            bpm: 60,
            stepsPerBeat: 2,
            voices: {
                lead: {
                    wave: 'sine', vol: 0.3, attack: 0.05, sustain: 0.6, release: 0.3,
                    pattern:
                        'E5 ~ ~ ~ ~ ~ . . | C5 ~ ~ ~ A4 ~ ~ . | G4 ~ ~ ~ ~ ~ . . | B4 ~ ~ ~ D5 ~ ~ . |' +
                        'C5 ~ ~ ~ ~ ~ . . | A4 ~ ~ ~ F4 ~ ~ . | F4 ~ ~ ~ A4 ~ ~ . | G#4 ~ ~ ~ ~ ~ . .',
                },
                arp: {
                    wave: 'triangle', vol: 0.1, attack: 0.02, sustain: 0.3, release: 0.2,
                    pattern:
                        'A3 E4 C4 E4 A3 E4 C4 E4 | F3 C4 A3 C4 F3 C4 A3 C4 | C4 G4 E4 G4 C4 G4 E4 G4 | G3 D4 B3 D4 G3 D4 B3 D4 |' +
                        'A3 E4 C4 E4 A3 E4 C4 E4 | F3 C4 A3 C4 F3 C4 A3 C4 | D4 A4 F4 A4 D4 A4 F4 A4 | E3 B3 G#3 B3 E3 B3 G#3 B3',
                },
                bass: {
                    wave: 'sine', vol: 0.35, attack: 0.1, sustain: 0.8, release: 0.4,
                    pattern:
                        'A2 ~ ~ ~ ~ ~ ~ . | F2 ~ ~ ~ ~ ~ ~ . | C3 ~ ~ ~ ~ ~ ~ . | G2 ~ ~ ~ ~ ~ ~ . |' +
                        'A2 ~ ~ ~ ~ ~ ~ . | F2 ~ ~ ~ ~ ~ ~ . | D2 ~ ~ ~ ~ ~ ~ . | E2 ~ ~ ~ ~ ~ ~ .',
                },
            },
        },
    },
};

if (typeof module !== 'undefined') module.exports = Music;
