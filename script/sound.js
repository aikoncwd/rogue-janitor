// Tiny synthesized sound effects (Web Audio API, no audio files).
var Sfx = {
    names: ['hit', 'yelp', 'faint', 'door', 'smash', 'gulp', 'munch', 'fanfareIn', 'fanfareOut',
        'mop', 'pickup', 'fix', 'secret', 'blip', 'heroHurt', 'slip', 'coins', 'spray', 'scrub',
        'goalDone', 'requestDone', 'questFound'],
    minGapMs: 70,
    maxPerSecond: 12,
    volume: 0.15,
    ctx: null,
    master: null,
    lastPlayed: {},
    recent: [],

    enabled: (function () {
        try {
            return localStorage.getItem('rj-sound') !== 'off';
        } catch (e) {
            return true;
        }
    })(),

    now: function () {
        return Date.now();
    },

    createContext: function () {
        let AC = window.AudioContext || window.webkitAudioContext;
        return new AC();
    },

    unlock: function () {
        if (this.ctx == null) {
            try {
                this.ctx = this.createContext();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.volume;
                this.master.connect(this.ctx.destination);
            } catch (e) {
                this.ctx = null;
                return;
            }
        }
        if (this.ctx.state == 'suspended' && this.ctx.resume) {
            this.ctx.resume();
        }
    },

    toggle: function () {
        this.enabled = !this.enabled;
        try {
            localStorage.setItem('rj-sound', this.enabled ? 'on' : 'off');
        } catch (e) {
            // storage unavailable: preference lasts for this session only
        }
        return this.enabled;
    },

    play: function (name) {
        if (!this.enabled || this.ctx == null || !(name in this.recipes)) {
            return false;
        }
        let t = this.now();
        if (name in this.lastPlayed && t - this.lastPlayed[name] < this.minGapMs) {
            return false;
        }
        this.recent = this.recent.filter(function (p) { return t - p < 1000; });
        if (this.recent.length >= this.maxPerSecond) {
            return false;
        }
        this.lastPlayed[name] = t;
        this.recent.push(t);
        try {
            this.recipes[name].call(this, this.ctx.currentTime);
        } catch (e) {
            return false;
        }
        return true;
    },

    // A single oscillator note with a quick attack and exponential decay.
    tone: function (start, freq, dur, type = 'square', vol = 1, slideTo = null) {
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (slideTo != null) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
        }
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(start);
        osc.stop(start + dur + 0.02);
    },

    // Filtered white noise burst.
    NOISE_SECONDS: 2, // longer than any burst; one buffer is shared by every sound
    noiseBuffer: null,
    noiseCtx: null,

    noise: function (start, dur, vol = 1, filterFreq = 1200, filterType = 'lowpass') {
        if (this.noiseBuffer == null || this.noiseCtx !== this.ctx) {
            let len = Math.floor(this.ctx.sampleRate * this.NOISE_SECONDS);
            this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            let data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < len; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            this.noiseCtx = this.ctx;
        }
        let src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        let filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreq, start);
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(start);
        src.stop(start + dur + 0.02);
    },

    recipes: {
        hit: function (t) { this.noise(t, 0.12, 0.9, 900); this.tone(t, 180, 0.1, 'square', 0.5, 70); },
        yelp: function (t) { this.tone(t, 520, 0.18, 'sawtooth', 0.4, 900); },
        faint: function (t) { this.tone(t, 400, 0.35, 'triangle', 0.6, 60); this.noise(t + 0.3, 0.1, 0.6, 300); },
        door: function (t) { this.noise(t, 0.2, 1, 400); this.tone(t, 90, 0.15, 'square', 0.4, 50); },
        smash: function (t) { this.noise(t, 0.3, 1, 2500, 'highpass'); this.tone(t, 140, 0.12, 'square', 0.4, 60); },
        gulp: function (t) { this.tone(t, 220, 0.08, 'sine', 0.8, 330); this.tone(t + 0.1, 200, 0.08, 'sine', 0.8, 300); this.tone(t + 0.2, 180, 0.1, 'sine', 0.8, 280); },
        munch: function (t) { this.noise(t, 0.06, 0.6, 3000, 'bandpass'); this.noise(t + 0.1, 0.06, 0.6, 2500, 'bandpass'); },
        fanfareIn: function (t) {
            let notes = [392, 523, 659, 784];
            for (let i = 0; i < notes.length; i++) {
                this.tone(t + i * 0.12, notes[i], i == notes.length - 1 ? 0.4 : 0.12, 'square', 0.5);
            }
        },
        fanfareOut: function (t) {
            let notes = [784, 659, 523, 392, 523];
            for (let i = 0; i < notes.length; i++) {
                this.tone(t + i * 0.14, notes[i], i == notes.length - 1 ? 0.35 : 0.13, 'triangle', 0.5);
            }
        },
        mop: function (t) { this.noise(t, 0.25, 0.5, 700, 'bandpass'); },
        pickup: function (t) { this.tone(t, 660, 0.06, 'square', 0.4); this.tone(t + 0.06, 990, 0.08, 'square', 0.4); },
        fix: function (t) { this.tone(t, 330, 0.07, 'square', 0.5); this.tone(t + 0.1, 330, 0.07, 'square', 0.5); this.tone(t + 0.2, 494, 0.12, 'square', 0.5); },
        secret: function (t) {
            let notes = [523, 659, 784, 1047, 1319];
            for (let i = 0; i < notes.length; i++) {
                this.tone(t + i * 0.08, notes[i], 0.12, 'triangle', 0.5);
            }
        },
        blip: function (t) { this.tone(t, 880, 0.04, 'square', 0.25); },
        heroHurt: function (t) { this.tone(t, 300, 0.15, 'sawtooth', 0.4, 150); },
        slip: function (t) { this.tone(t, 300, 0.25, 'sine', 0.6, 1200); this.noise(t + 0.2, 0.12, 0.5, 500); },
        coins: function (t) { this.tone(t, 1319, 0.06, 'square', 0.3); this.tone(t + 0.07, 1760, 0.12, 'square', 0.3); },
        scrub: function (t) { this.noise(t, 0.1, 0.5, 900, 'bandpass'); this.noise(t + 0.12, 0.1, 0.5, 1100, 'bandpass'); },
        spray: function (t) { this.noise(t, 0.35, 0.5, 5000, 'highpass'); },
        // a goal ticked off: a quick major arpeggio and a held chord on top
        goalDone: function (t) {
            let notes = [523, 659, 784];
            for (let i = 0; i < notes.length; i++) {
                this.tone(t + i * 0.07, notes[i], 0.1, 'square', 0.4);
            }
            this.tone(t + 0.22, 1047, 0.45, 'square', 0.35);
            this.tone(t + 0.22, 784, 0.45, 'triangle', 0.35);
        },
        // a colleague says thanks: two warm "ding-dong" bells
        requestDone: function (t) {
            this.tone(t, 880, 0.35, 'triangle', 0.6);
            this.tone(t, 1760, 0.2, 'sine', 0.2);
            this.tone(t + 0.18, 659, 0.5, 'triangle', 0.6);
            this.tone(t + 0.18, 1319, 0.3, 'sine', 0.2);
        },
        // someone's lost thing turns up: a curious little rising twinkle
        questFound: function (t) {
            let notes = [587, 740, 880, 1175];
            for (let i = 0; i < notes.length; i++) {
                this.tone(t + i * 0.09, notes[i], 0.16, 'sine', 0.55);
            }
            this.tone(t + 0.36, 1480, 0.3, 'triangle', 0.3);
        },
    },
};

if (typeof module !== 'undefined') module.exports = Sfx;
