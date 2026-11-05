const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, cleaningDay, strip, load } = require('./harness');

// Watch (instantly) a raid with the given chances, then clock in.
function raid(seed, zap, ring) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Adventurer.ZAP_CHANCE = zap;
    ctx.Adventurer.RING_CHANCE = ring;
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) {
        ctx.Game.player.talking.lastConvoChange = 0;
        ctx.__press(13);
    }
    return ctx;
}

function messes(ctx, kind) {
    return Object.values(ctx.Game.map).filter(t => t.mess && t.mess.kind == kind).map(t => t.mess);
}

test('the hero leaves used-up wands and staves', () => {
    const ctx = raid(1234, 1, 0);
    const used = messes(ctx, 'Used Wand').concat(messes(ctx, 'Cracked Staff'));
    assert.ok(used.length >= 1 && used.length <= 2, 'zaps: ' + used.length);
    for (const w of used) {
        assert.match(w.name, /Wand|Staff/);
        assert.strictEqual(w.cleanMethod, 'get');
    }
    assert.ok(used.some(w => w.char == '/' || w.char == '_'));
});

test('at most two rings per raid (from the hero; a kicked sink may cough up its own)', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = raid(seed, 0, 1);
        const rings = messes(ctx, 'Lost Ring');
        const tried = ctx.Game.adventurer.ringsDropped || 0;
        assert.ok(tried >= 1 && tried <= ctx.Adventurer.MAX_RINGS, 'seed ' + seed + ': ' + tried);
        assert.ok(rings.length >= tried, 'seed ' + seed + ': ' + rings.length + ' on the floor');
        for (const r of rings) assert.match(r.name, /ring/i);
    }
});

test('picking up a ring fills the inventory', () => {
    const ctx = raid(1234, 0, 0);
    const G = ctx.Game;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const d = dirs.find(([dx, dy]) => { const t = G.map[(G.player.x + dx) + ',' + (G.player.y + dy)]; return t && t.passThrough() && t.mess == null; });
    const ring = ctx.makeMess(G.player.x + d[0], G.player.y + d[1], 'LostRing');
    assert.strictEqual(G.inventory.length, 0);
    ctx.__press(80); // P
    assert.strictEqual(G.inventory.length, 1);
    assert.strictEqual(G.inventory[0].kind, 'ring');
    assert.strictEqual(G.inventory[0].name, ring.name);
    assert.ok(G.inventory[0].lore.length > 5);
    const said = G.log.recent(3).map(l => strip(l.text)).join(' ');
    assert.ok(!/the a /.test(said), said);
});

test('wands are the same watched or skipped', () => {
    const count = (skip) => {
        const ctx = toIntro(bootHeadless({ seed: 77, begin: true }));
        ctx.Adventurer.ZAP_CHANCE = 0.2;
        ctx.Adventurer.RING_CHANCE = 0.05;
        if (skip) {
            ctx.Invasion.instant = true;
            ctx.__press(13);
        }
        else {
            ctx.__press(13);
            let n = 0;
            while (ctx.Game.phase == 'invasion' && n++ < 4000) {
                if (ctx.Invasion.stage != null) ctx.__press(13);
                else ctx.__runTimers();
            }
            assert.strictEqual(ctx.Game.phase, 'cleaning');
        }
        return ['Used Wand', 'Cracked Staff', 'Lost Ring'].map(k => messes(ctx, k).map(m => m.name).sort().join(',')).join('|');
    };
    assert.strictEqual(count(false), count(true));
});

test('old saves load without inventory', () => {
    const ctx = raid(1234, 0, 0);
    ctx.Game.inventory.push({ kind: 'ring', name: 'a jade ring', lore: 'x' });
    const data = JSON.parse(JSON.stringify(ctx.Save.snapshot()));
    assert.strictEqual(data.inventory.length, 1);
    delete data.inventory;
    ctx.Save.restore(data);
    assert.deepStrictEqual(Array.from(ctx.Game.inventory), []);
});

// An open 9x9 floor around the player, nothing on it.
function openFloor(ctx, r = 4) {
    const G = ctx.Game;
    const px = G.player.x, py = G.player.y;
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        if (i == 0 && j == 0) { G.map[px + ',' + py].mess = null; continue; }
        G.map[(px + i) + ',' + (py + j)] = new ctx.Tile(px + i, py + j, '.', '#ddd', '#000', true, true);
    }
    return { px, py };
}

function morning(seed, watched) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    if (watched) {
        ctx.__press(13);
        let n = 0;
        while (ctx.Game.phase == 'invasion' && n++ < 4000) {
            if (ctx.Invasion.stage != null) ctx.__press(13); // the hand-over card waits for a key
            else ctx.__runTimers();
        }
        assert.strictEqual(ctx.Game.phase, 'cleaning', 'watched raid reached the morning');
    }
    else {
        ctx.Invasion.instant = true;
        ctx.__press(13);
        ctx.Invasion.instant = false;
    }
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

// 12. lost rings pick their name once
test('a lost ring does not roll Flavor.rng for a name it will lose', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const { px, py } = openFloor(ctx);
    const before = JSON.stringify(ctx.Flavor.rng.getState());
    ctx.makeMess(px + 1, py, 'LostRing');
    assert.strictEqual(JSON.stringify(ctx.Flavor.rng.getState()), before);
});

test('a dropped ring still gets a name and a story', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const hero = G.adventurer;
    const spot = [G.player.x + 1, G.player.y];
    hero.litterSpot = () => spot;
    G.map[spot[0] + ',' + spot[1]].mess = null;
    assert.ok(hero.tryDropRing());
    const ring = G.map[spot[0] + ',' + spot[1]].mess;
    assert.ok(ctx.Lore.ringNames.includes(ring.name));
    assert.ok(ctx.Lore.ringLore.includes(ring.ringLore));
});

test('picking up a ring says so once', () => {
    const ctx = morning(1234, false);
    const G = ctx.Game;
    const key = (G.player.x + 1) + ',' + G.player.y;
    G.map[key] = new ctx.Tile(G.player.x + 1, G.player.y, '.', '#ddd', '#000', true, true);
    ctx.makeMess(G.player.x + 1, G.player.y, 'LostRing');
    ctx.__press(80);
    const lines = G.log.recent(3).map(l => strip(l.text));
    assert.ok(!lines.some(l => /^You pick up/.test(l)), lines.join(' | '));
    assert.ok(lines.some(l => /^You pocket/.test(l)));
});
