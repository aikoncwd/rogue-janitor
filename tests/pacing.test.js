const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const KEY = { ENTER: 13, SPACE: 32, F: 70, ESC: 27 };

// Into the invasion, with a fresh, quiet turn (nothing happened, nobody in view).
function invading(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.__press(KEY.ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    ctx.Invasion.busy = false;
    ctx.Invasion.extra = 0;
    ctx.Invasion.speaking = false;
    ctx.Game.adventurer.targets = [];
    return ctx;
}

test('walking turns use the original walking speed', () => {
    const ctx = invading();
    assert.equal(ctx.Invasion.WALK_MS, 90);
    assert.equal(ctx.Invasion.turnDelay(), 90);
});

test('turns with action use the original action speed', () => {
    for (const ev of ['door', 'loot', 'heroHurt']) {
        const ctx = invading();
        ctx.Invasion.event(ev, ev == 'loot' ? { entity: { name: 'Barrel' } } : {});
        assert.equal(ctx.Invasion.turnDelay(), 200, ev);
    }
});

test('monsters in view make it an action turn', () => {
    const ctx = invading();
    ctx.Game.adventurer.targets = [ctx.Game.monsterList[0]];
    assert.equal(ctx.Invasion.turnDelay(), 200);
});

test('special actions add a little on top', () => {
    const cases = { potion: 320, snack: 300, special: 350, enter: 350 };
    for (const ev in cases) {
        const ctx = invading();
        ctx.Invasion.event(ev, ev == 'special' ? { cls: 'Paladin' } : {});
        assert.equal(ctx.Invasion.turnDelay(), cases[ev], ev);
    }
});

test('the longest extra wins, no stacking', () => {
    const ctx = invading();
    ctx.Invasion.event('snack', {});
    ctx.Invasion.event('potion', {});
    assert.equal(ctx.Invasion.turnDelay(), 320);
    assert.equal(ctx.Invasion.speaking, true);
});

test('no turn is longer than MAX_TURN_MS', () => {
    const ctx = invading();
    assert.equal(ctx.Invasion.MAX_TURN_MS, 350);
    for (const k in ctx.Invasion.EXTRA_MS) {
        ctx.Invasion.beat(k);
        assert.ok(ctx.Invasion.turnDelay() <= 350, k);
    }
});

test('fast mode divides the whole turn', () => {
    const ctx = invading();
    ctx.Invasion.event('potion', {});
    ctx.__press(KEY.F);
    assert.equal(ctx.Invasion.turnDelay(), 320 / ctx.Invasion.FAST_FACTOR);
});

test('pacing state resets after the hero turn is scheduled', () => {
    const ctx = invading();
    ctx.Invasion.event('potion', {});
    ctx.__runTimers(); // monsters and the hero take their turns, next turn is scheduled
    const next = ctx.__timers[ctx.__timers.length - 1];
    assert.ok(next.ms >= 320, 'scheduled ' + next.ms);
    assert.equal(ctx.Invasion.busy, false);
    assert.equal(ctx.Invasion.extra, 0);
    assert.equal(ctx.Invasion.speaking, false);
});

test('skipping schedules no hero timers', () => {
    const ctx = invading();
    ctx.__press(KEY.ESC);
    assert.equal(ctx.__timers.filter(t => t.ms >= 90 && t.ms <= 350).length, 0);
});

test('a paced invasion walks at 90, acts at 200 and holds a little more now and then', () => {
    const ctx = invading(7);
    ctx.Game.adventurer.heroClass = 'Paladin'; // speedrunners run at x0.7
    const seen = new Set();
    for (let i = 0; i < 400 && ctx.Game.phase == 'invasion' && ctx.Invasion.stage == null; i++) {
        const t = ctx.__timers.find(x => x.ms !== ctx.Game.QUEST_BLINK_MS);
        if (t) seen.add(t.ms);
        ctx.__runTimers();
    }
    assert.ok(seen.has(90), 'walking: ' + [...seen].join(','));
    assert.ok(seen.has(200), 'action: ' + [...seen].join(','));
    assert.ok([...seen].some(ms => ms > 200 && ms <= 350), 'small holds: ' + [...seen].join(','));
    assert.ok([...seen].every(ms => ms <= 350), 'never too long: ' + [...seen].join(','));
});

test('turning fast mode on during a hold shortens the wait right away', () => {
    const ctx = invading();
    let t = 1000;
    ctx.Invasion.now = () => t;
    ctx.Invasion.event('enter', {});
    ctx.__runTimers(); // next hero turn scheduled with the hold
    const held = ctx.__timers.find(x => x.ms >= 300);
    assert.ok(held, 'a hold is pending');
    t += 100;
    ctx.__press(KEY.F);
    const pending = ctx.__timers.filter(x => x.ms !== ctx.Game.QUEST_BLINK_MS);
    assert.equal(pending.length, 1, 'only one hero timer');
    assert.ok(pending[0].ms <= (held.ms - 100) / ctx.Invasion.FAST_FACTOR + 1, 'rescheduled at x4: ' + pending[0].ms);
    const turns = ctx.Game.adventurer.turns;
    ctx.__runTimers();
    assert.equal(ctx.Game.adventurer.turns, turns + 1, 'engine resumes once');
});
