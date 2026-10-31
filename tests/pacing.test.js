const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, ESC: 27 };

function invading(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    ctx.Invasion.hold = 0;
    ctx.Invasion.speaking = false;
    return ctx;
}

test('quiet turns are fast', () => {
    const ctx = invading();
    assert.equal(ctx.Invasion.turnDelay(), ctx.Invasion.BEATS.quiet);
});

test('a potion holds long enough to read', () => {
    const ctx = invading();
    ctx.Invasion.event('potion', {});
    assert.ok(ctx.Invasion.turnDelay() >= ctx.Invasion.BEATS.potion);
    assert.equal(ctx.Invasion.speaking, true);
});

test('longer lines hold a bit longer, capped', () => {
    const ctx = invading();
    const inv = ctx.Invasion;
    inv.beat('potion', 'short');
    const a = inv.turnDelay();
    inv.hold = 0;
    inv.beat('potion', 'x'.repeat(200));
    assert.ok(inv.turnDelay() > a);
    assert.equal(inv.turnDelay(), inv.BEATS.potion + 250);
});

test('holds take the longest beat of the turn', () => {
    const ctx = invading();
    ctx.Invasion.event('door', {});
    ctx.Invasion.event('potion', {});
    ctx.Invasion.event('door', {});
    assert.ok(ctx.Invasion.turnDelay() >= ctx.Invasion.BEATS.potion);
});

test('fast mode divides holds', () => {
    const ctx = invading();
    ctx.Invasion.event('potion', {});
    const d = ctx.Invasion.turnDelay();
    ctx.__press(KEY.SPACE);
    assert.equal(ctx.Invasion.turnDelay(), d / ctx.Invasion.FAST_FACTOR);
});

test('hold resets after the hero turn is scheduled', () => {
    const ctx = invading();
    ctx.Invasion.event('potion', {});
    ctx.__runTimers(); // monsters and the hero take their turns, next turn is scheduled
    const next = ctx.__timers[ctx.__timers.length - 1];
    assert.ok(next.ms >= ctx.Invasion.BEATS.potion, 'scheduled ' + next.ms);
    assert.equal(ctx.Invasion.hold, 0);
    assert.equal(ctx.Invasion.speaking, false);
});

test('skipping schedules no hero timers', () => {
    const ctx = invading();
    ctx.__press(KEY.ESC);
    const beats = Object.values(ctx.Invasion.BEATS);
    assert.equal(ctx.__timers.filter(t => beats.includes(t.ms)).length, 0);
});

test('a paced invasion uses many different delays', () => {
    const ctx = invading(7);
    const seen = new Set();
    for (let i = 0; i < 400 && ctx.Game.phase == 'invasion' && ctx.Invasion.stage == null; i++) {
        const t = ctx.__timers.find(x => x.ms !== ctx.Game.QUEST_BLINK_MS);
        if (t) seen.add(t.ms);
        ctx.__runTimers();
    }
    assert.ok(seen.has(ctx.Invasion.BEATS.quiet), 'quick corridor steps');
    assert.ok([...seen].some(ms => ms >= 350), 'some long holds: ' + [...seen].join(','));
    assert.ok(seen.size >= 4, 'varied rhythm: ' + [...seen].join(','));
});

test('turning fast mode on during a long hold shortens the wait right away', () => {
    const ctx = invading();
    let t = 1000;
    ctx.Invasion.now = () => t;
    ctx.Invasion.event('enter', {});
    ctx.__runTimers(); // next hero turn scheduled with the long hold
    const held = ctx.__timers.find(x => x.ms >= ctx.Invasion.BEATS.enter);
    assert.ok(held, 'a long hold is pending');
    t += 200; // 200 ms into the hold
    ctx.__press(KEY.SPACE);
    const pending = ctx.__timers.filter(x => x.ms >= ctx.Invasion.BEATS.quiet && x.ms !== ctx.Game.QUEST_BLINK_MS);
    assert.equal(pending.length, 1, 'only one hero timer');
    assert.ok(pending[0].ms <= (held.ms - 200) / ctx.Invasion.FAST_FACTOR + 1, 'rescheduled at x4: ' + pending[0].ms);
    const turns = ctx.Game.adventurer.turns;
    ctx.__runTimers();
    assert.equal(ctx.Game.adventurer.turns, turns + 1, 'engine resumes once');
});

test('beats are gentle: half of the first, too marked, rhythm', () => {
    const ctx = invading();
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.Invasion.BEATS)), {
        quiet: 25, spot: 200, hit: 100, combo: 75, faint: 350, loot: 225, door: 175, heroHurt: 125,
        snack: 450, potion: 550, special: 550, graffiti: 550, enter: 600, cry: 450,
    });
});
