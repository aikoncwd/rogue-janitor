const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, ESC: 27, LEFT: 37, V: 86 };

function bootDay1(seed = 1234) {
    const ctx = bootHeadless({ seed, begin: true });
    return ctx;
}

test('day 1 boots into intro and waits', () => {
    const ctx = bootDay1();
    assert.equal(ctx.Game.phase, 'intro');
    assert.equal(ctx.Game.adventurer.turns, -1);
    assert.equal(ctx.__timers.length, 0);
    const text = ctx.__drawn.filter(d => d.text).map(d => d.text).join('\n');
    assert.ok(text.includes('A HERO approaches'), 'intro text drawn');
});

test('any key starts paced invasion', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    assert.equal(ctx.Game.adventurer.turns, 0);
    assert.equal(ctx.__timers.length, 1);
});

test('timer advances one hero turn', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    ctx.__runTimers();
    assert.equal(ctx.Game.adventurer.turns, 1);
    assert.equal(ctx.__timers.length, 1);
});

test('turn delay: action turns use the base delay, space makes it 4x faster', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    const inv = ctx.Invasion;
    assert.equal(inv.delay(true), inv.BASE_DELAY_MS);
    assert.equal(inv.delay(false), inv.BORING_DELAY_MS);
    ctx.__press(KEY.SPACE);
    assert.equal(inv.fast, true);
    assert.equal(inv.delay(true), inv.BASE_DELAY_MS / inv.FAST_FACTOR);
    ctx.__runTimers();
    assert.ok(ctx.__timers[0].ms <= inv.BASE_DELAY_MS / inv.FAST_FACTOR);
    ctx.__press(KEY.SPACE);
    assert.equal(inv.fast, false);
});

test('esc skips to cleaning with no double unlock', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    for (let i = 0; i < 3; i++) ctx.__runTimers();
    ctx.__press(KEY.ESC);
    assert.equal(ctx.Game.phase, 'invasion', 'the hand-over pause comes first');
    assert.equal(ctx.Invasion.stage, 'linger');
    ctx.__press(KEY.ENTER); // any key hurries the hand-over
    assert.equal(ctx.Game.phase, 'cleaning');
    assert.equal(ctx.Invasion.stage, null);
    assert.equal(ctx.Game.adventurer.active, false);
    const stray = ctx.__timers.filter(t => t.id !== ctx.Game.questBlinkTimer); // quest '!' blink is fine
    assert.equal(stray.length, 0, 'no stray timer left to unlock the engine again');
    assert.equal(ctx.Game.engine._lock, 1, 'engine held by the player only');
    assert.equal(ctx.Invasion.skipping, false);
    const playerListeners = ctx.__listeners.filter(l => l.fn === ctx.Game.player);
    assert.equal(playerListeners.length, 1);
});

test('movement keys ignored during invasion', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    const p = [ctx.Game.player.x, ctx.Game.player.y];
    const turns = ctx.Game.adventurer.turns;
    ctx.__press(KEY.LEFT);
    ctx.__press(77); // m (mop)
    assert.deepEqual([ctx.Game.player.x, ctx.Game.player.y], p);
    assert.equal(ctx.Game.adventurer.turns, turns);
    // direct call is also gated
    ctx.Game.player.handleEvent({ keyCode: KEY.LEFT });
    assert.deepEqual([ctx.Game.player.x, ctx.Game.player.y], p);
});

test('day 2 invasion is paced after nextDay', () => {
    const ctx = bootDay1();
    ctx.Invasion.instant = true;
    ctx.__press(KEY.ENTER); // whole day-1 invasion runs, player now holds the engine
    assert.equal(ctx.Game.phase, 'cleaning');
    ctx.Invasion.instant = false;
    ctx.Game.nextDay(); // called from inside a conversation in the real game
    assert.equal(ctx.Game.phase, 'invasion');
    ctx.Game.player.endTurn(); // the conversation ends and the player releases the engine
    assert.equal(ctx.Game.adventurer.turns, 0);
    assert.equal(ctx.__timers.length, 1);
    assert.notEqual(ctx.Invasion.hero.full, '');
});

test('V toggles sound in any phase', () => {
    const ctx = bootDay1();
    const before = ctx.Sfx.enabled;
    ctx.__press(KEY.V);
    assert.equal(ctx.Sfx.enabled, !before);
    assert.equal(ctx.Game.phase, 'intro', 'V does not start the invasion');
    ctx.__press(KEY.ENTER);
    ctx.__press(KEY.V);
    assert.equal(ctx.Sfx.enabled, before);
});

test('camera follows the hero during the invasion and the player after', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.cameraTarget(), ctx.Game.adventurer);
    ctx.__press(KEY.ESC);
    assert.equal(ctx.Game.cameraTarget(), ctx.Invasion.exitSpot, 'lingers on the stairs the hero left by');
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.cameraTarget(), ctx.Game.player);
});

test('player glyph not drawn during invasion', () => {
    const ctx = bootDay1();
    ctx.__press(KEY.ENTER);
    for (let i = 0; i < 5; i++) ctx.__runTimers();
    ctx.Game.drawMap();
    assert.ok(!ctx.__drawn.some(d => d.ch === '@' && d.fg === ctx.Game.player.color), 'the janitor is not drawn');
    assert.ok(ctx.__drawn.some(d => d.ch === '@' && d.fg === ctx.Game.adventurer.color), 'hero is drawn');
});
