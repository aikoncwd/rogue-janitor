const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
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

// A free floor tile next to the player: [x, y, keyCode towards it].
function freeBeside(ctx) {
    const G = ctx.Game;
    const dirs = { '1,0': 39, '-1,0': 37, '0,1': 40, '0,-1': 38 };
    for (const d in dirs) {
        const [dx, dy] = d.split(',').map(Number);
        const t = G.map[(G.player.x + dx) + ',' + (G.player.y + dy)];
        if (t && t.passThrough() && t.mess == null) return [G.player.x + dx, G.player.y + dy, dirs[d]];
    }
    throw new Error('no free tile beside the player');
}

test('cleanPercent with no mess is 100', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.messNumbers = [0, 0];
    assert.strictEqual(G.cleanPercent(), 100);
    assert.ok(!/NaN/.test(G.shiftReport()));
    assert.ok(!/NaN/.test(G.plaqueLines().join('\n')));
});

test('cleanPercent has no side effects', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.messNumbers = [10, 100];
    const before = G.monsterList.map(m => m.quests.length);
    for (let i = 0; i < 50; i++) {
        G.coffeeThreshold = -1;
        G.inviteOutThreshold = -1;
        G.cleanPercent();
    }
    assert.deepStrictEqual(G.monsterList.map(m => m.quests.length), before);
});

test('cleaning triggers the coffee milestone', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [x, y] = freeBeside(ctx);
    ctx.makeMess(x, y, 'Water');
    G.coffeeThreshold = -1;
    const before = G.monsterList.reduce((s, m) => s + m.quests.length, 0);
    ctx.__press(77); // M
    const after = G.monsterList.reduce((s, m) => s + m.quests.length, 0);
    assert.ok(after > before, 'some comrade got a coffee quest');
});

test('findFreeNear returns the nearest free tile', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [x, y] = freeBeside(ctx);
    assert.deepStrictEqual(Array.from(ctx.findFreeNear(x, y)), [x, y]);
    // the player's own tile is occupied: the answer is one step away
    const r = ctx.findFreeNear(G.player.x, G.player.y);
    assert.strictEqual(Math.max(Math.abs(r[0] - G.player.x), Math.abs(r[1] - G.player.y)), 1);
    assert.strictEqual(ctx.findFreeNear(100000, 100000, 3), null);
});

test('Pet.recenter does not move when nothing is free', () => {
    const ctx = cleaningDay();
    const pet = Object.create(ctx.Pet.prototype);
    Object.assign(pet, { x: 7, y: 8, home: null, tags: { animal: true } });
    const orig = ctx.findFreeNear;
    ctx.findFreeNear = () => null;
    try {
        pet.recenter(50, 50);
    } finally {
        ctx.findFreeNear = orig;
    }
    assert.deepStrictEqual([pet.x, pet.y], [7, 8]);
});

test('push messages lower-case the chest', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [x, y, key] = freeBeside(ctx);
    const chest = ctx.GetEntity('Chest', x, y);
    assert.strictEqual(chest.name, 'Treasure Chest');
    ctx.__press(key);
    const last = G.log.recent(3).map(l => l.text).join(' ');
    assert.match(last, /the treasure chest/);
});

test('visitors never found the union', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.unionist = null;
    const orig = ctx.RandomName;
    ctx.RandomName = () => 'Marx';
    try {
        new ctx.Entity(G.player.x, G.player.y, 'V', '#fff', 'Visitor', 1, { monster: true, visitor: true }, 1);
    } finally {
        ctx.RandomName = orig;
    }
    assert.strictEqual(G.unionist, null);
});

test('player art has the tile background', () => {
    const ctx = cleaningDay();
    const art = ctx.Game.player.getArt();
    assert.strictEqual(typeof art[2], 'string');
});

test('noise reuses one buffer', () => {
    const ctx = cleaningDay();
    let created = 0;
    const node = () => ({ connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {} }, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
    ctx.Sfx.ctx = {
        sampleRate: 8000,
        createBuffer(ch, len) { created++; const d = new Float32Array(len); return { getChannelData: () => d, length: len, duration: len / 8000 }; },
        createBufferSource: node, createBiquadFilter: node, createGain: node,
    };
    ctx.Sfx.master = node();
    ctx.Sfx.noise(0, 0.1);
    ctx.Sfx.noise(0.2, 0.05);
    ctx.Sfx.noise(0.4, 0.2);
    assert.strictEqual(created, 1);
});
