const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');
const NEW = ['Tourist', 'Valkyrie', 'Speedrunner', 'Necromancer'];
const SIGNATURE = {
    Tourist: 'Expensive Gift Shop Receipt',
    Valkyrie: 'Melted Frost',
    Speedrunner: 'Energy Drink Can',
    Necromancer: 'Page of the Necronomicon (do not read aloud)',
};

function dungeon(seed = 1234) {
    const ctx = bootHeadless({ seed });
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.reset(ctx.Game.adventurer);
    return ctx;
}

function messNamed(ctx, name) {
    for (const k in ctx.Game.map) {
        const m = ctx.Game.map[k].mess;
        if (m && m.name == name) return m;
    }
    return null;
}

// Moves an actor onto a floor tile that touches a plain wall; returns the wall key.
function nextToWall(ctx, actor) {
    const G = ctx.Game;
    for (const k in G.map) {
        const t = G.map[k];
        if (!t.passable || t.entity != null || t.door != null) continue;
        const [x, y] = k.split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const w = G.map[(x + dx) + ',' + (y + dy)];
            if (w && !w.passable && w.char == '#' && w.mess == null && w.secretDoor == null && w.door == null && w.entity == null) {
                const old = G.map[actor.x + ',' + actor.y];
                if (old && old.entity === actor) old.entity = null;
                actor.x = x; actor.y = y; t.entity = actor;
                return (x + dx) + ',' + (y + dy);
            }
        }
    }
    throw new Error('no wall');
}

test('new classes have a special, a stat and flavor lines', () => {
    const ctx = dungeon();
    for (const cls of NEW) {
        const def = ctx.Adventurer.classes[cls];
        assert.ok(def && def.special && def.stat, cls);
        assert.ok(ctx.Flavor.pools.heroClass.includes(cls), cls);
        assert.ok(ctx.Flavor.pools['special_' + cls].length >= 3, cls);
    }
    for (const name of ['Rodney', 'Ascension Andy', 'Scummy McSavefile']) {
        assert.ok(ctx.Flavor.pools.heroFirst.includes(name), name);
    }
});

test('each new special leaves its signature mess', () => {
    for (const cls of NEW) {
        const ctx = dungeon();
        const hero = ctx.Game.adventurer;
        hero.setClass(cls);
        assert.ok(hero[ctx.Adventurer.classes[cls].special](), cls + ' special did something');
        assert.ok(messNamed(ctx, SIGNATURE[cls]), cls + ' left ' + SIGNATURE[cls]);
    }
});

test('special events are spaced out and happen at all', () => {
    let total = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
        const ctx = toIntro(bootHeadless({ seed, begin: true }));
        const turns = [];
        const real = ctx.Invasion.event.bind(ctx.Invasion);
        ctx.Invasion.event = (type, data) => {
            if (['lost', 'scroll', 'backIn5', 'elbereth'].includes(type)) turns.push(ctx.Game.adventurer.turns);
            return real(type, data);
        };
        ctx.Invasion.instant = true;
        ctx.__press(13);
        for (let i = 1; i < turns.length; i++) {
            assert.ok(turns[i] - turns[i - 1] >= ctx.Adventurer.EVENT_GAP, 'seed ' + seed + ': ' + turns.join(','));
        }
        total += turns.length;
    }
    assert.ok(total > 0, 'some special event in six invasions');
});

test('save-scum happens once and replaces that potion', () => {
    const ctx = dungeon();
    const hero = ctx.Game.adventurer;
    hero.turns = 10; hero.hp = 0;
    const potions = ctx.Invasion.stats.potions;
    hero.takeTurn();
    assert.equal(hero.hp, hero.maxHp);
    assert.equal(hero.savedOnce, true);
    assert.equal(ctx.Invasion.stats.potions, potions, 'no potion this time');
    assert.ok(ctx.Game.log.lines.some(l => /Restoring from save/.test(strip(l.text))));
    hero.turns = 15; hero.hp = 0;
    hero.takeTurn();
    assert.equal(ctx.Invasion.stats.potions, potions + 1, 'the next time it is a potion');
});

test('a scroll never teleports the hero', () => {
    for (let seed = 1; seed <= 20; seed++) {
        const ctx = dungeon(seed);
        const hero = ctx.Game.adventurer;
        const from = hero.x + ',' + hero.y;
        assert.ok(hero.doEvent('scroll'));
        assert.equal(hero.x + ',' + hero.y, from, 'seed ' + seed);
        assert.ok(!ctx.Game.log.lines.some(l => /teleport|vanishes|elsewhere/i.test(strip(l.text))));
    }
});

test('Elbereth engraving is graffiti and apologises when erased', () => {
    const ctx = dungeon();
    const hero = ctx.Game.adventurer;
    nextToWall(ctx, hero);
    assert.ok(hero.doEvent('elbereth'));
    const wall = Object.keys(ctx.Game.map).find(k => ctx.Game.map[k].mess && ctx.Game.map[k].mess.elbereth);
    const m = wall ? ctx.Game.map[wall].mess : null;
    assert.ok(m && m.elbereth, 'engraved on the wall next to the hero');
    assert.equal(m.kind, 'Graffiti');
    assert.ok(/Elbereth/.test(m.name));

    // the janitor scrubs it off
    const p = ctx.Game.player;
    ctx.Game.phase = 'cleaning';
    const [wx, wy] = wall.split(',').map(Number);
    const old = ctx.Game.map[hero.x + ',' + hero.y];
    old.entity = p; p.x = hero.x; p.y = hero.y;
    for (let i = 0; i < 6 && ctx.Game.map[wall].mess != null; i++) p.clean('mop');
    assert.equal(ctx.Game.map[wall].mess, null);
    assert.ok(ctx.Game.log.lines.some(l => strip(l.text) == 'You erase the engraving. Sorry, Elbereth.'), wx + ',' + wy);
});

test('Rodney and the Amulet appear in the invasion lines', () => {
    const ctx = dungeon();
    assert.ok(ctx.Flavor.pools.heroAmulet.length >= 3 && ctx.Flavor.pools.heroAmulet.every(l => /Amulet/i.test(l)));
    assert.ok(ctx.Flavor.pools.rodneyReply.length >= 3 && ctx.Flavor.pools.rodneyReply.some(l => /Rodney/.test(l)));
    ctx.Flavor.chance = () => true;
    ctx.Invasion.event('enter', {});
    const text = ctx.Game.log.lines.map(l => strip(l.text)).join('\n');
    assert.ok(/Amulet/i.test(text) && /Rodney|stairs/.test(text), text);
});

test('speedrunners are quicker', () => {
    const ctx = dungeon();
    ctx.Game.adventurer.setClass('Speedrunner');
    ctx.Game.adventurer.targets = [];
    ctx.Invasion.busy = false; ctx.Invasion.extra = 0;
    assert.equal(ctx.Invasion.turnDelay(), 90 * 0.7);
});
