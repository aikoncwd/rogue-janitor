const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

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

test('at most two rings per raid', () => {
    for (const seed of [1, 2, 3]) {
        const ctx = raid(seed, 0, 1);
        const rings = messes(ctx, 'Lost Ring');
        assert.ok(rings.length >= 1 && rings.length <= 2, 'seed ' + seed + ': ' + rings.length);
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
