const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, F: 70, ESC: 27, LEFT: 37, M: 77, V: 86, T: 84 };
const plain = s => s.replace(/%c\{[^}]*\}/g, '');

function invading(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    return ctx;
}

function text(ctx) {
    return ctx.__drawn.filter(d => d.text).map(d => plain(d.text)).join('\n');
}

function nags(ctx) {
    const pool = ctx.Flavor.pools.playbackNag;
    return ctx.Game.log.lines.filter(l => pool.includes(l.text)).length;
}

test('banner shows REC, PLAYBACK and the clock', () => {
    const ctx = invading();
    ctx.Game.drawMap();
    assert.match(ctx.Invasion.clockText(), /^\d\d:\d\d AM$/);
    assert.ok(text(ctx).includes('PLAYBACK'));
    assert.ok(text(ctx).includes('REC'));
    assert.ok(text(ctx).includes(ctx.Invasion.clockText()));
});

test('clock starts between 01:00 and 02:30 AM', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
        const ctx = invading(seed);
        assert.ok(ctx.Invasion.clockMinutes >= 60 && ctx.Invasion.clockMinutes <= 151, String(ctx.Invasion.clockMinutes));
        assert.ok(ctx.Invasion.camera >= 1 && ctx.Invasion.camera <= 9);
    }
});

test('clock text formats minutes', () => {
    const ctx = invading();
    ctx.Invasion.clockMinutes = 167;
    assert.equal(ctx.Invasion.clockText(), '02:47 AM');
    ctx.Invasion.clockMinutes = 5;
    assert.equal(ctx.Invasion.clockText(), '12:05 AM');
});

test('clock advances one minute per hero turn', () => {
    const ctx = invading();
    const m = ctx.Invasion.clockMinutes;
    ctx.__runTimers();
    assert.equal(ctx.Invasion.clockMinutes, m + 1);
});

test('fast mode shows x4', () => {
    const ctx = invading();
    assert.ok(!plain(ctx.Invasion.bannerText(100)).includes('x4'));
    ctx.__press(KEY.F);
    assert.ok(plain(ctx.Invasion.bannerText(100)).includes('\u25b6\u25b6 x4'));
});

test('banner shortens on narrow maps', () => {
    const ctx = invading();
    const full = plain(ctx.Invasion.bannerText(120));
    assert.ok(full.includes('floating eye') && !full.includes('just watch'));
    const mid = plain(ctx.Invasion.bannerText(64));
    assert.ok(mid.length <= 62 && mid.includes('PLAYBACK'), mid);
    const narrow = plain(ctx.Invasion.bannerText(30));
    assert.ok(narrow.length <= 28 && narrow.includes('REC'), narrow);
});

test('rec dot blinks with the turns', () => {
    const ctx = invading();
    ctx.Invasion.turn = 0;
    const a = ctx.Invasion.bannerText(100);
    ctx.Invasion.turn = 2;
    const b = ctx.Invasion.bannerText(100);
    assert.notEqual(a, b);
    assert.equal(plain(a), plain(b));
});

test('no banner while skipping or during the hand-over', () => {
    const ctx = invading();
    ctx.__press(KEY.ESC);
    assert.equal(ctx.Invasion.stage, 'linger');
    ctx.Game.drawMap();
    assert.ok(!text(ctx).includes('PLAYBACK'));
});

test('nag is throttled and ignores control keys', () => {
    const ctx = invading();
    let t = 100000;
    ctx.Invasion.now = () => t;
    ctx.__press(KEY.LEFT);
    assert.equal(nags(ctx), 1);
    ctx.__press(KEY.LEFT);
    assert.equal(nags(ctx), 1, 'throttled');
    t += 5000;
    ctx.__press(KEY.M);
    assert.equal(nags(ctx), 2);
    t += 5000;
    ctx.__press(KEY.V);
    ctx.__press(KEY.T);
    ctx.__press(107, 0, '+');
    assert.equal(nags(ctx), 2, 'global keys never nag');
    ctx.__press(KEY.F);
    assert.equal(ctx.Invasion.fast, true);
    assert.equal(nags(ctx), 2, 'F never nags');
});

test('WASD, PgUp/Home and wait/examine keys also get the reminder', () => {
    for (const code of [68, 87, 33, 36, 190, 53, 12, 69]) {
        const ctx = invading();
        ctx.__press(code);
        assert.equal(nags(ctx), 1, 'key ' + code);
    }
});

test('how-to does not promise help that only works during the shift', () => {
    const ctx = invading();
    const text = ctx.Flavor.pools.howtoText.join('\n');
    assert.ok(!/any time/.test(text));
    assert.ok(/during your shift/.test(text));
});

test('banner sits on a wall-grey strip, not a black hole', () => {
    const ctx = invading();
    ctx.Game.drawMap();
    const b = ctx.__drawn.find(d => d.text && d.text.includes('PLAYBACK'));
    assert.ok(b.text.startsWith('%b{' + ctx.Game.dungeonTheme.roomWalls[1] + '}'), b.text.slice(0, 20));
});
