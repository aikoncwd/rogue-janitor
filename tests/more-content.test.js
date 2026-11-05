const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    assert.equal(ctx.Game.phase, 'cleaning');
    ctx.Game.player.talking = null;
    return ctx;
}

function dungeon(seed = 1234) {
    const ctx = bootHeadless({ seed });
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.reset(ctx.Game.adventurer);
    return ctx;
}

const freeKey = ctx => ctx.Game.freeCells.find(k => {
    const t = ctx.Game.map[k];
    return t.entity == null && !t.important && t.mess == null && t.door == null;
});

// ---------------------------------------------------------------- the night log

test('the main event pools have plenty of lines and placeholders that get filled', () => {
    const ctx = bootHeadless({ files: ['script/flavor.js'], game: false });
    const P = ctx.Flavor.pools;
    for (const p of ['heroEnter', 'heroCry', 'heroHit', 'monsterPain', 'monsterFaint', 'doorKick', 'lootSmash',
        'snack', 'potion', 'heroHurt', 'heroExit', 'heroQuip', 'devAside', 'monsterBanter']) {
        assert.ok(P[p].length >= 12, p + ' ' + P[p].length);
    }
    const known = ['hero', 'monster', 'item', 'other', 'trap', 'wand', 'effect', 'day'];
    for (const [name, pool] of Object.entries(P)) {
        if (!Array.isArray(pool)) continue;
        for (const line of pool) {
            for (const m of line.matchAll(/\{(\w+)\}/g)) {
                assert.ok(known.includes(m[1]), name + ': {' + m[1] + '}');
            }
        }
    }
});

test('Flavor.pick uses a specialised pool now and then, and the base otherwise', () => {
    const ctx = bootHeadless({ files: ['script/flavor.js'], game: false });
    const F = ctx.Flavor;
    assert.equal(F.pick('monsterPain', 'Floating Eye', 1), 'monsterPain_FloatingEye');
    assert.equal(F.pick('monsterPain', 'Floating Eye', 0), 'monsterPain');
    assert.equal(F.pick('monsterPain', 'Nobody', 1), 'monsterPain');
    assert.equal(F.pick('lootSmash', undefined, 1), 'lootSmash');
});

test('every hero class has a special, a stat, special lines and leaves its mess', () => {
    const ctx = dungeon();
    for (const cls of ctx.Flavor.pools.heroClass) {
        const def = ctx.Adventurer.classes[cls];
        assert.ok(def && def.special && def.stat, cls);
        assert.ok(ctx.Flavor.pools['special_' + cls].length >= 3, cls);
    }
    for (const cls of ['Monk', 'Healer', 'Berserker', 'Wanderer']) {
        const c = dungeon();
        const hero = c.Game.adventurer;
        hero.setClass(cls);
        assert.ok(hero[c.Adventurer.classes[cls].special](), cls);
    }
});

test('a whole raid with every aside switched on still reaches the morning', () => {
    const ctx = toIntro(bootHeadless({ seed: 5, begin: true }));
    ctx.Flavor.chance = () => true;
    ctx.Invasion.instant = true;
    for (let i = 0; i < 6 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(13);
    assert.equal(ctx.Game.phase, 'cleaning');
    const said = ctx.Invasion.transcript.map(l => strip(l.text));
    assert.ok(said.length > 20);
    assert.ok(said.every(l => !/\{\w+\}/.test(l)), said.find(l => /\{\w+\}/.test(l)));
});

// ---------------------------------------------------------------- monsters and furniture

test('the new monsters exist, with their own lines and messes', () => {
    const ctx = dungeon();
    const key = freeKey(ctx);
    const [x, y] = key.split(',').map(Number);
    const kinds = { Newt: 'Newt', FruitBat: 'Fruit Bat', FloatingEye: 'Floating Eye', Leprechaun: 'Leprechaun',
        Cockatrice: 'Cockatrice', GelatinousCube: 'Gelatinous Cube', Unicorn: 'Unicorn', Lich: 'Lich' };
    for (const [k, species] of Object.entries(kinds)) {
        const m = ctx.GetEntity(k, x, y);
        assert.equal(m.species, species, k);
        assert.ok('monster' in m.tags, k);
        assert.ok(ctx.Flavor.pools['monsterPain_' + species.replace(/ /g, '')].length >= 2, k);
        assert.ok(ctx.Flavor.pools['monsterFaint_' + species.replace(/ /g, '')].length >= 1, k);
        for (const t of ['bleeds', 'trail', 'rangeMess']) {
            if (m.tags[t]) assert.notEqual(ctx.makeMess(x, y, m.tags[t]).name, 'Discarded Candy Wrapper', k + ' ' + t);
        }
        if (m.bonusMess) assert.notEqual(ctx.makeMess(x, y, m.bonusMess).name, 'Discarded Candy Wrapper', k);
        ctx.Game.map[m.x + ',' + m.y].entity = null;
    }
});

test('a returning species reuses its retired comrade', () => {
    const ctx = dungeon();
    const key = freeKey(ctx);
    const [x, y] = key.split(',').map(Number);
    const bat = ctx.GetEntity('FruitBat', x, y);
    bat.alive = false;
    ctx.Game.map[bat.x + ',' + bat.y].entity = null;
    ctx.ROT.RNG.getItem = arr => arr.includes('FruitBat') ? 'FruitBat' : arr[0];
    assert.strictEqual(ctx.AddMonster(x, y, 1), bat);
});

test('new furniture breaks into something to fix, with its own smash lines', () => {
    for (const k of ['Throne', 'Sink', 'Dummy', 'SnackMachine', 'FishTank', 'Altar', 'ArmorStand', 'CrystalBall']) {
        const ctx = dungeon();
        const key = freeKey(ctx);
        const [x, y] = key.split(',').map(Number);
        const e = ctx.GetEntity(k, x, y);
        assert.equal(e.lootKey, k);
        assert.ok(ctx.Flavor.pools['lootSmash_' + k].length >= 2, k);
        e.adventurerAct();
        const broken = ctx.Game.map[e.x + ',' + e.y].mess;
        assert.ok(broken && broken.cleanMethod == 'fix' && broken.parent === e, k);
    }
});

test('the new litter is vacuumed, squeegeed or picked up as you would expect', () => {
    const ctx = dungeon();
    const key = freeKey(ctx);
    const [x, y] = key.split(',').map(Number);
    for (const [type, method] of Object.entries({ Glitter: 'mop', Confetti: 'mop', Straw: 'mop', RustFlakes: 'mop',
        Dice: 'get', BananaPeel: 'get', CubeLeftovers: 'get', WorthlessGlass: 'get', SprungTrap: 'fix', EyeDrops: 'mop' })) {
        ctx.Game.map[key].mess = null;
        assert.equal(ctx.makeMess(x, y, type).cleanMethod, method, type);
    }
    for (const k of ['Glitter', 'Confetti', 'Loose Straw', 'Rust Flakes']) assert.ok(ctx.Game.VACUUM_KINDS.includes(k), k);
    assert.ok(ctx.Game.WATER_KINDS.includes('Puddle of Eye Drops'));
});

// ---------------------------------------------------------------- traps

test('traps are placed, sprung by the hero, logged and re-armed', () => {
    const ctx = dungeon();
    assert.ok(ctx.Traps.hidden() >= ctx.Traps.MIN, 'placed: ' + ctx.Traps.hidden());
    const hero = ctx.Game.adventurer;
    const key = freeKey(ctx);
    const [x, y] = key.split(',').map(Number);
    ctx.Game.map[key].trap = 'glitter';
    hero.moveTo(x, y);
    assert.equal(ctx.Game.map[key].trap, null);
    const sprung = ctx.Game.map[key].mess;
    assert.equal(sprung.kind, 'Sprung Trap');
    assert.equal(sprung.name, 'Sprung Glitter Trap');
    assert.equal(sprung.trap, 'glitter');
    assert.equal(ctx.Invasion.stats.traps, 1);
    assert.ok(ctx.Invasion.transcript.some(l => /glitter trap/i.test(strip(l.text))));
    assert.ok(Object.values(ctx.Game.map).some(t => t.mess && t.mess.kind == 'Glitter'));
});

test('every kind of trap can go off', () => {
    const ctx = dungeon();
    for (const kind of Object.keys(ctx.Traps.KINDS)) {
        const hero = ctx.Game.adventurer;
        const key = ctx.Game.freeCells.find(k => {
            const t = ctx.Game.map[k];
            return t.entity == null && !t.important && t.door == null && t.mess == null;
        });
        ctx.Game.map[key].trap = kind;
        const [x, y] = key.split(',').map(Number);
        hero.moveTo(x, y);
        assert.equal(ctx.Game.map[key].mess.trap, kind, kind);
        assert.ok(ctx.Flavor.pools['trap_' + kind].length >= 2, kind);
    }
});

test('the janitor re-arms a sprung trap with fix', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const k = (p.x + 1) + ',' + p.y;
    const t = ctx.Game.map[k];
    t.entity = null; t.passable = true; t.important = false; t.door = null; t.mess = null;
    const m = ctx.makeMess(p.x + 1, p.y, 'SprungTrap');
    m.trap = 'pie'; m.name = 'Sprung Cream Pie Trap';
    p.clean('fix');
    assert.equal(t.mess, null);
    const said = ctx.Game.log.lines.map(l => strip(l.text)).find(l => /cream pie trap/i.test(l));
    assert.ok(said && !/sprung/i.test(said), said);
    assert.equal(ctx.Game.run.counts.traps, 1);
});

test('the same seed hides the same traps', () => {
    const where = ctx => Object.keys(ctx.Game.map).filter(k => ctx.Game.map[k].trap != null).sort().join(' ');
    const a = dungeon(42), b = dungeon(42);
    assert.equal(where(a), where(b));
});

// ---------------------------------------------------------------- favours

test('favours come in many kinds, and a comrade does not always ask about their own mess', () => {
    const ctx = cleaningDay();
    const R = ctx.Requests;
    assert.ok(R.types.length >= 25, 'kinds: ' + R.types.length);
    const key = freeKey(ctx);
    const [x, y] = key.split(',').map(Number);
    ctx.makeMess(x, y, 'Spores');
    const picks = new Set();
    const myconid = { species: 'Myconid', convoTags: {} };
    for (let i = 0; i < 60; i++) picks.add(R.pick(myconid).key);
    assert.ok(picks.has('spores'));
    assert.ok(picks.size > 1, [...picks].join(','));
});

test('the same favour is asked and thanked in different words', () => {
    const ctx = cleaningDay();
    const R = ctx.Requests;
    const asks = new Set(), thanks = new Set();
    for (let i = 0; i < 40; i++) {
        const convos = [];
        R.push(convos, R.type('graffiti'));
        asks.add(convos[0][0].text);
        thanks.add(convos[1][0].text);
        assert.match(convos[1][0].text, /graffiti/);
    }
    assert.ok(asks.size >= 2 && thanks.size >= 3);
});

// ---------------------------------------------------------------- shift events

function runEvent(name) {
    const ctx = cleaningDay();
    ctx.Game.day = 3;
    assert.ok(ctx.DayEvents.eligible(name), name + ' eligible');
    ctx.DayEvents.run(name);
    assert.equal(ctx.Game.todayEvent, name);
    return ctx;
}

test('a guest from another dungeon visits the lounge, with a favour when there is one to ask', () => {
    const ctx = runEvent('guest');
    const g = ctx.Game.monsterList.filter(m => m.tags.visitor);
    assert.equal(g.length, 1);
    assert.ok(ctx.Lore.guests.some(d => d.name == g[0].name));
    assert.equal(ctx.Game.run.guestsSeen.length, 1);
    assert.ok(g[0].convos.length >= 2);
});

test('the wandering DM brings dice to ask about', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 3;
    ctx.Game.run.guestsSeen = ctx.Lore.guests.filter(g => g.id != 'dnd').map(g => g.id);
    ctx.DayEvents.run('guest');
    const gary = ctx.Game.monsterList.find(m => m.tags.visitor);
    assert.ok(ctx.Requests.remaining('dice') > 0);
    assert.ok(gary.convos.some(c => c[0].tags && 'offerSeen' in c[0].tags), 'asks the favour');
});

test('each guest only comes once a run', () => {
    const ctx = cleaningDay();
    ctx.Game.day = 3;
    for (let i = 0; i < ctx.Lore.guests.length; i++) {
        ctx.Visitors.clear();
        ctx.DayEvents.run('guest');
    }
    assert.equal(new Set(ctx.Game.run.guestsSeen).size, ctx.Lore.guests.length);
    assert.equal(ctx.DayEvents.eligible('guest'), false);
});

test('the monkey leaves slippery banana peels and pinches something', () => {
    const ctx = runEvent('monkey');
    const peels = Object.values(ctx.Game.map).filter(t => t.mess && t.mess.kind == 'Banana Peel');
    assert.ok(peels.length >= ctx.DayEvents.MONKEY_PEELS[0]);
    assert.ok(peels.every(t => t.mess.slippery));
});

test('dice night spills dice all over', () => {
    const ctx = runEvent('diceNight');
    const dice = Object.values(ctx.Game.map).filter(t => t.mess && t.mess.kind == 'Stray Die');
    assert.ok(dice.length >= ctx.DayEvents.DICE[0]);
});

test('a leaky ceiling drips water into one room, a few times', () => {
    const ctx = runEvent('leak');
    const before = Object.values(ctx.Game.map).filter(t => t.mess && t.mess.kind == 'Water').length;
    const t0 = ctx.Game.turnCount;
    for (let i = 1; i <= ctx.DayEvents.LEAK_EVERY * (ctx.DayEvents.LEAK_MAX + 3); i++) {
        ctx.Game.turnCount = t0 + i;
        ctx.DayEvents.tick();
    }
    const after = Object.values(ctx.Game.map).filter(t => t.mess && t.mess.kind == 'Water').length;
    assert.ok(after > before && after - before <= ctx.DayEvents.LEAK_MAX, before + ' -> ' + after);
});

test('new nights out have their own scenes', () => {
    const ctx = bootHeadless({});
    assert.equal(ctx.Scenes.forPlan('dice night'), 'dinner');
    assert.equal(ctx.Scenes.forPlan('karaoke'), 'dancing');
});
