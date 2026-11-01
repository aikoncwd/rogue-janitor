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

// Puts a lounge comrade right next to the janitor; returns [monster, key towards it].
function besidePlayer(ctx) {
    const G = ctx.Game;
    const m = G.monsterList.find(m => m.alive && m.retired && !m.partying && !m.tags.visitor);
    const dirs = { '1,0': 39, '-1,0': 37, '0,1': 40, '0,-1': 38 };
    for (const d in dirs) {
        const [dx, dy] = d.split(',').map(Number);
        const k = (G.player.x + dx) + ',' + (G.player.y + dy);
        if (G.map[k] && G.map[k].passThrough()) {
            G.map[m.x + ',' + m.y].entity = null;
            m.x = G.player.x + dx;
            m.y = G.player.y + dy;
            G.map[k].entity = m;
            m.home = [m.x, m.y];
            return [m, dirs[d]];
        }
    }
    throw new Error('no free tile next to the player');
}

test('a comrade bringing a quest right after a chat does not freeze the game', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [m, key] = besidePlayer(ctx);
    m.coffeeQuest();
    m.quests.shift(); // next step: walk up and hand the coffee convo over
    m.lastConvoChange = 0;
    ctx.__press(key); // chat normally
    assert.strictEqual(G.player.talking, m);
    let i = 0;
    while (G.player.talking === m && i++ < 30) {
        m.lastConvoChange = 0; // a human reading each line: > 200 ms between presses
        ctx.__press(13);
    }
    // whatever happens next, the player can still act: either talking or listening for keys
    const listening = ctx.__listeners.some(l => l.fn === G.player);
    assert.ok(G.player.talking != null || listening, 'player must be talking or able to move');
});

test('bumping a comrade quickly after a chat still opens a conversation', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [m, key] = besidePlayer(ctx);
    m.lastConvoChange = Date.now(); // a convo line changed a moment ago
    const before = m.convos.length;
    ctx.__press(key);
    assert.strictEqual(G.player.talking, m);
    assert.ok(m.convoInnerDex >= 0);
    assert.strictEqual(m.convos.length, before, 'the chosen conversation is not thrown away');
});

test('every map tile knows its own coordinates (secret-door hints depend on it)', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    let bad = [];
    for (const k in G.map) {
        const [x, y] = k.split(',').map(Number);
        if (G.map[k].x !== x || G.map[k].y !== y) bad.push(k);
    }
    assert.deepStrictEqual(bad.slice(0, 5), []);
});

test('drawing the map does not consume the world RNG', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    // put a secret door right next to the janitor so the hint roll happens
    const k = (G.player.x) + ',' + (G.player.y - 1);
    G.map[k].secretDoor = { char: '+', door: '-', color: '#fff', bgColor: '#000', sound: 'You hear a test.' };
    const state = JSON.stringify(ctx.ROT.RNG.getState());
    for (let i = 0; i < 5; i++) G.drawMap();
    assert.strictEqual(JSON.stringify(ctx.ROT.RNG.getState()), state);
});

test('a conversation node runs once per key press', () => {
    const ctx = cleaningDay();
    const [m, key] = besidePlayer(ctx);
    let runs = 0;
    const orig = m.doConvo;
    m.doConvo = function () { runs++; return orig.apply(this, arguments); };
    m.convos.push([{ text: 'one', any: 1 }, { text: 'two', any: -1 }]);
    m.lastConvoChange = 0;
    ctx.__press(key);
    runs = 0;
    m.lastConvoChange = 0;
    ctx.__press(13);
    assert.strictEqual(runs, 1);
});

test('quest givers can swap places with a comrade blocking a corridor', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const lounge = G.monsterList.filter(m => m.alive && !m.tags.visitor);
    const a = lounge[0], b = lounge[1];
    // a and b side by side on a free row
    const row = G.freeCells.map(k => k.split(',').map(Number)).find(([x, y]) =>
        [0, 1].every(d => { const t = G.map[(x + d) + ',' + y]; return t && t.passThrough() || (t && (t.entity === a || t.entity === b)); }));
    for (const [m, d] of [[a, 0], [b, 1]]) {
        G.map[m.x + ',' + m.y].entity = null;
        m.x = row[0] + d; m.y = row[1];
        G.map[m.x + ',' + m.y].entity = m;
    }
    assert.ok(a.moveTo(b.x, b.y, true));
    assert.strictEqual(a.x, row[0] + 1);
    assert.strictEqual(b.x, row[0]);
});

test('petting a pet does not also hug it', () => {
    const ctx = cleaningDay();
    const anims = [];
    const fake = { doAnimation(n) { anims.push(n); } };
    ctx.Pet.prototype.petAction.call(fake, 'pet');
    assert.deepStrictEqual(anims, ['pet']);
});
