// Loads rot.js and the game's global scripts into an isolated vm context with
// minimal DOM stubs, so game logic can be exercised from node:test.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const DEFAULT_FILES = [
    'script/flavor.js',
    'script/messagelog.js',
    'script/sound.js',
    'script/music.js',
    'script/invasion.js',
    'script/panel.js',
    'script/effects.js',
    'script/game.js',
    'script/player.js',
    'script/tile.js',
    'script/mess.js',
    'script/entity.js',
    'script/pet.js',
    'script/adventurer.js',
    'script/conversations.js',
];

function makeContext() {
    const listeners = [];
    const timers = [];
    let timerId = 0;
    const storage = {};
    const drawn = [];
    const ctx = {
        console: { log() {}, warn: console.warn, error: console.error },
        Math, Date, JSON, Object, Array, String, Number, Boolean, Error, parseInt, parseFloat, isNaN,
        __listeners: listeners,
        __timers: timers,
        __drawn: drawn,
        __storage: storage,
    };
    ctx.window = {
        addEventListener(type, fn) { listeners.push({ type, fn }); },
        removeEventListener(type, fn) {
            const i = listeners.findIndex(l => l.type === type && l.fn === fn);
            if (i >= 0) listeners.splice(i, 1);
        },
    };
    ctx.addEventListener = ctx.window.addEventListener;
    ctx.removeEventListener = ctx.window.removeEventListener;
    ctx.document = {
        getElementById() { return { clientWidth: 1000, clientHeight: 600, appendChild() {} }; },
    };
    ctx.localStorage = {
        getItem(k) { return k in storage ? storage[k] : null; },
        setItem(k, v) { storage[k] = String(v); },
        removeItem(k) { delete storage[k]; },
    };
    ctx.window.localStorage = ctx.localStorage;
    ctx.setTimeout = function (fn, ms) {
        const id = ++timerId;
        timers.push({ id, fn, ms: ms || 0 });
        return id;
    };
    ctx.clearTimeout = function (id) {
        const i = timers.findIndex(t => t.id === id);
        if (i >= 0) timers.splice(i, 1);
    };
    ctx.window.setTimeout = ctx.setTimeout;
    ctx.window.clearTimeout = ctx.clearTimeout;
    // Runs every currently queued timer once (timers queued while running wait for the next call).
    ctx.__runTimers = function () {
        const batch = timers.splice(0, timers.length);
        for (const t of batch) t.fn();
        return batch.length;
    };
    ctx.__press = function (keyCode, charCode = 0, key = undefined) {
        const ev = { keyCode, charCode, key, which: keyCode, preventDefault() {}, stopPropagation() {} };
        for (const l of listeners.slice()) {
            if (l.type !== 'keydown') continue;
            if (typeof l.fn === 'function') l.fn(ev);
            else if (l.fn && typeof l.fn.handleEvent === 'function') l.fn.handleEvent(ev);
        }
    };
    vm.createContext(ctx);
    return ctx;
}

function load(ctx, file) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
}

function stubDisplay(ctx) {
    return {
        draw(x, y, ch, fg, bg) { ctx.__drawn.push({ x, y, ch, fg, bg }); },
        drawText(x, y, text, maxWidth) { ctx.__drawn.push({ x, y, text, maxWidth }); return 1; },
        clear() { ctx.__drawn.length = 0; },
        computeSize() { return [100, 40]; },
        setOptions(o) { ctx.__displayOptions = Object.assign(ctx.__displayOptions || {}, o); },
        getContainer() { return {}; },
    };
}

// Boots the game without a DOM: Game.init minus the canvas. With begin=false no
// dungeon is generated (tests call Game.generateDungeon themselves); with
// begin=true it runs Game.begin() like the browser does (day 1 intro screen).
function bootHeadless({ seed = 1234, files = DEFAULT_FILES, game = true, begin = false } = {}) {
    const ctx = makeContext();
    load(ctx, 'tests/vendor/rot.js');
    ctx.ROT.RNG.setSeed(seed);
    for (const f of files) load(ctx, f);
    if (game && ctx.Game) {
        ctx.Game.screen = ctx.document.getElementById('gameContainer');
        ctx.Game.display = stubDisplay(ctx);
        ctx.Game.getSize(false);
        ctx.Game.setup();
        if (begin) ctx.Game.begin();
    }
    return ctx;
}

function run(ctx, code) {
    return vm.runInContext(code, ctx);
}

module.exports = { bootHeadless, run, DEFAULT_FILES, makeContext, load };
