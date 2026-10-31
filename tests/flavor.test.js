const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

const boot = () => bootHeadless({ files: ['script/flavor.js'], game: false });

const EVENT_POOLS = ['heroEnter', 'heroCry', 'heroHit', 'monsterPain', 'monsterFaint', 'doorKick',
    'lootSmash', 'snack', 'potion', 'heroHurt', 'heroExit', 'monstersGetUp', 'shiftBegins'];
const NAME_POOLS = ['heroFirst', 'heroLast', 'heroClass'];

test('line substitutes placeholders', () => {
    const ctx = boot();
    ctx.Flavor.pools.t = ['{hero} hits {monster} for the {item}!'];
    assert.equal(ctx.Flavor.line('t', { hero: 'Brakka', monster: 'Gob the Goblin', item: 'chest' }),
        'Brakka hits Gob the Goblin for the chest!');
});

test('line never repeats twice in a row', () => {
    const ctx = boot();
    for (const pool of ['heroCry', 'monsterPain']) {
        let prev = '';
        for (let i = 0; i < 200; i++) {
            const l = ctx.Flavor.line(pool);
            assert.notEqual(l, prev);
            prev = l;
        }
    }
});

test('single-line pool keeps returning its line', () => {
    const ctx = boot();
    ctx.Flavor.pools.one = ['only'];
    assert.equal(ctx.Flavor.line('one'), 'only');
    assert.equal(ctx.Flavor.line('one'), 'only');
});

test('all required pools exist with enough lines', () => {
    const ctx = boot();
    for (const p of EVENT_POOLS) {
        assert.ok(Array.isArray(ctx.Flavor.pools[p]) && ctx.Flavor.pools[p].length >= 8, p);
    }
    for (const p of NAME_POOLS) {
        assert.ok(ctx.Flavor.pools[p].length >= 8, p);
    }
    const intro = ctx.Flavor.pools.introText;
    assert.ok(intro.length >= 6 && intro.length <= 10, 'introText ' + intro.length);
});

test('heroName full = short + " the " + class', () => {
    const ctx = boot();
    for (let i = 0; i < 20; i++) {
        const h = ctx.Flavor.heroName();
        assert.ok(h.short.length > 0);
        const cls = h.full.slice((h.short + ' the ').length);
        assert.ok(h.full.startsWith(h.short + ' the '), h.full);
        assert.ok(ctx.Flavor.pools.heroClass.includes(cls), cls);
    }
});
