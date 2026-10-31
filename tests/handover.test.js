const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

const KEY = { ENTER: 13, ESC: 27 };

// Day 1 with a controllable clock: the hand-over stages are timed with Invasion.now().
function bootWithClock() {
    const ctx = bootHeadless({ begin: true });
    let t = 0;
    ctx.Invasion.now = () => t;
    ctx.__advance = ms => { t += ms; };
    return ctx;
}

// Runs timers, moving the clock forward, until the shift starts (or gives up).
function runUntilCleaning(ctx, stepMs = 50) {
    const seen = [];
    for (let i = 0; i < 5000 && ctx.Game.phase !== 'cleaning'; i++) {
        if (ctx.Invasion.stage && seen[seen.length - 1] !== ctx.Invasion.stage) seen.push(ctx.Invasion.stage);
        ctx.__advance(stepMs);
        if (ctx.__runTimers() === 0) break;
    }
    return seen;
}

test('after the hero leaves the game lingers, closes the curtain and shows a title card', () => {
    const ctx = bootWithClock();
    ctx.__press(KEY.ENTER);
    const stages = runUntilCleaning(ctx);
    assert.deepEqual(stages, ['linger', 'curtain', 'card']);
    assert.equal(ctx.Game.phase, 'cleaning');
    assert.equal(ctx.Game.engine._lock, 1, 'engine held by the player only');
    assert.equal(ctx.__timers.filter(x => x.ms === ctx.Invasion.TICK_MS).length, 0, 'no hand-over timer left');
});

test('the hand-over takes a moment instead of cutting straight to the shift', () => {
    const ctx = bootWithClock();
    ctx.__press(KEY.ENTER);
    ctx.__press(KEY.ESC);
    assert.equal(ctx.Game.phase, 'invasion');
    ctx.__advance(ctx.Invasion.SKIP_LINGER_MS - 10);
    ctx.__runTimers();
    assert.equal(ctx.Invasion.stage, 'linger', 'still lingering just before the deadline');
    assert.ok(ctx.Game.log.lines.some(l => /stairs|leaves|departs|exits|gone|vanishes/.test(l.text)), 'hero exit is logged during the pause');
});

test('the title card names the day and is drawn instead of the map', () => {
    const ctx = bootWithClock();
    ctx.__press(KEY.ENTER);
    ctx.__press(KEY.ESC);
    while (ctx.Invasion.stage !== 'card') { ctx.__advance(50); ctx.__runTimers(); }
    ctx.Game.drawMap();
    const text = ctx.__drawn.filter(d => d.text).map(d => d.text).join('\n');
    assert.match(text, /day 1/i);
    assert.ok(!ctx.__drawn.some(d => d.ch === '#'), 'map walls are not drawn on the card');
});

test('the curtain blacks out rows from both edges of the map', () => {
    const ctx = bootWithClock();
    ctx.__press(KEY.ENTER);
    ctx.__press(KEY.ESC);
    while (ctx.Invasion.stage !== 'curtain') { ctx.__advance(50); ctx.__runTimers(); }
    ctx.__advance(ctx.Invasion.CURTAIN_MS / 2);
    const rows = ctx.Game.layoutInfo.mapRows;
    const covered = ctx.Invasion.curtainRows(rows);
    assert.ok(covered > 0 && covered < rows / 2, 'half way through: ' + covered);
    ctx.Game.drawMap();
    const top = ctx.__drawn.filter(d => d.y === 0 && d.ch === ' ' && d.bg === '#000');
    const bottom = ctx.__drawn.filter(d => d.y === rows - 1 && d.ch === ' ' && d.bg === '#000');
    assert.ok(top.length >= ctx.Game.layoutInfo.mapCols);
    assert.ok(bottom.length >= ctx.Game.layoutInfo.mapCols);
});

test('instant invasions (tests, skipping logic) still hand over synchronously', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.Invasion.instant = true;
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'cleaning');
    assert.equal(ctx.Invasion.stage, null);
});
