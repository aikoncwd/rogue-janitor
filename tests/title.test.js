const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, ESC: 27, Q: 81, V: 86, T: 84 };

function boot(seed = 1234) {
    return bootHeadless({ seed, begin: true });
}

function text(ctx) {
    return ctx.__drawn.filter(d => d.text).map(d => d.text).join('\n');
}

const plain = s => s.replace(/%c\{[^}]*\}/g, '');

test('day 1 boots into the title', () => {
    const ctx = boot();
    assert.equal(ctx.Game.phase, 'title');
    assert.ok(text(ctx).includes('Shall I pick a mop for you?'));
    assert.ok(text(ctx).includes('3.6.0-mop'));
    assert.notEqual(ctx.Title.timer, null);
    assert.equal(ctx.Game.adventurer.turns, -1);
});

test('title -> howto -> intro -> invasion, one key each', () => {
    const ctx = boot();
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'howto');
    assert.ok(text(ctx).includes('NOT'));
    assert.ok(text(ctx).includes('security footage'));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'intro');
    assert.ok(text(ctx).includes('A HERO approaches'));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    assert.equal(ctx.Game.adventurer.turns, 0);
});

test('q on the title tells the union joke and stays', () => {
    const ctx = boot();
    ctx.__press(KEY.Q, 0, 'q');
    assert.equal(ctx.Game.phase, 'title');
    assert.ok(text(ctx).includes('Union rules'));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'howto');
});

test('title animates on its timer', () => {
    const ctx = boot();
    const f = ctx.Title.frame;
    ctx.__runTimers();
    assert.equal(ctx.Title.frame, f + 1);
    assert.ok(ctx.__timers.some(t => t.ms === ctx.Title.TICK_MS), 'next frame queued');
    assert.ok(text(ctx).includes('Shall I pick a mop for you?'), 'redrawn');
});

test('title timer stops when leaving the title', () => {
    const ctx = boot();
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Title.timer, null);
    assert.equal(ctx.__timers.filter(t => t.ms === ctx.Title.TICK_MS).length, 0);
});

test('zoom keys do not advance the title', () => {
    const ctx = boot();
    ctx.__press(107, 0, '+');
    ctx.__press(109, 0, '-');
    ctx.__press(48, 0, '0');
    assert.equal(ctx.Game.phase, 'title');
    assert.ok(text(ctx).includes('Shall I pick a mop for you?'));
});

test('V and T do not advance the title', () => {
    const ctx = boot();
    ctx.__press(KEY.V);
    ctx.__press(KEY.T);
    assert.equal(ctx.Game.phase, 'title');
});

test('esc and space on pre-invasion screens just advance', () => {
    const ctx = boot();
    ctx.__press(KEY.ESC);
    assert.equal(ctx.Game.phase, 'howto');
    ctx.__press(KEY.SPACE);
    assert.equal(ctx.Game.phase, 'intro');
    ctx.__press(KEY.ESC);
    assert.equal(ctx.Game.phase, 'invasion');
    assert.equal(ctx.Invasion.skipping, false);
    assert.equal(ctx.Invasion.fast, false);
    assert.equal(ctx.Game.adventurer.turns, 0);
});

test('narrow screen title fits', () => {
    const ctx = boot();
    const lines = ctx.Title.lines(50);
    for (const l of lines) assert.ok(plain(l).length <= 50, 'too wide: ' + plain(l));
    assert.ok(lines.some(l => plain(l).includes('R O G U E')));
});

test('wide screen title has the big logo', () => {
    const ctx = boot();
    const lines = ctx.Title.lines(100);
    for (const l of lines) assert.ok(plain(l).length <= 100);
    assert.ok(!lines.some(l => plain(l).includes('R O G U E')));
    assert.ok(lines.filter(l => plain(l).includes('█')).length >= 5, 'five rows of block letters');
});

test('the janitor walks and the broom spins', () => {
    const ctx = boot();
    const at = () => ctx.Title.lines(100).map(plain).find(l => l.includes('@'));
    const a = at();
    ctx.__runTimers();
    const b = at();
    assert.notEqual(a.indexOf('@'), b.indexOf('@'));
});

test('day 2 has no title or howto', () => {
    const ctx = boot();
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'cleaning');
    ctx.Invasion.instant = false;
    ctx.Game.nextDay();
    assert.equal(ctx.Game.phase, 'invasion');
});

test('how-to indented lines keep their indent (rot.js drops leading spaces)', () => {
    const ctx = boot();
    ctx.__press(KEY.ENTER);
    const find = s => ctx.__drawn.find(d => d.text && d.text.includes(s));
    const head = find('1. TONIGHT');
    const cont = find('security footage');
    assert.ok(!/^ /.test(cont.text), 'no leading spaces handed to rot.js');
    assert.equal(cont.x - head.x, 13);
});

test('each tagline stays about six seconds so it can be read', () => {
    const ctx = boot();
    const first = ctx.Title.tagline;
    const ticks = Math.round(5500 / ctx.Title.TICK_MS);
    for (let i = 0; i < ticks; i++) ctx.__runTimers();
    assert.equal(ctx.Title.tagline, first, 'still showing after 5.5 s');
    for (let i = ticks; i < Math.round(6000 / ctx.Title.TICK_MS); i++) ctx.__runTimers();
    assert.notEqual(ctx.Title.tagline, first, 'changes at 6 s');
});
