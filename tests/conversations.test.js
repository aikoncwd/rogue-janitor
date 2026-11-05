const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro, cleaningDay } = require('./harness');

function cleaning() {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    while (ctx.Game.player.talking) ctx.Game.player.talking.cancelConvo();
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

test('M-1: conversation text is wrapped inside the map area, not over the panel', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    const m = G.monsterList.find(x => x.alive && x.retired);
    m.convos.push([{ text: 'word '.repeat(60), any: -1 }]);
    m.convoIndex = m.convos.length - 1;
    m.convoInnerDex = 0;
    G.player.talking = m;
    G.drawMap();
    const mapTexts = ctx.__drawn.filter(d => d.text && d.x < G.layoutInfo.panelX && d.y < G.layoutInfo.logY);
    assert.ok(mapTexts.length > 0);
    for (const d of mapTexts) {
        assert.ok(d.maxWidth !== undefined && d.x + d.maxWidth <= G.layoutInfo.mapCols, JSON.stringify(d).slice(0, 120));
    }
});

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

test('a comrade on an errand waits while you are talking to someone else', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const [a, b] = G.monsterList.filter(m => m.alive && m.retired && !m.partying && !m.tags.visitor);
    a.cleanerAct(); // you are chatting with a
    assert.strictEqual(G.player.talking, a);
    b.quests = [[{ text: 'Hi!', any: -1 }]];
    // b is right next to you
    const spot = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
        .map(([dx, dy]) => [G.player.x + dx, G.player.y + dy])
        .find(([x, y]) => { const t = G.map[x + ',' + y]; return t && t.passable && t.entity == null; });
    G.map[b.x + ',' + b.y].entity = null;
    b.x = spot[0]; b.y = spot[1];
    G.map[spot.join(',')].entity = b;
    b.home = [b.x, b.y];
    b.questAct();
    assert.strictEqual(G.player.talking, a, 'still talking to a');
    assert.strictEqual(b.quests.length, 1, 'b keeps the errand for later');
});

test('conditions with words in them are true or false, never 0', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.convoTags.dinnerPlan = 'bowling';
    assert.strictEqual(G.checkConditions({ dinnerPlan: 'bowling' }), true);
    assert.strictEqual(G.checkConditions({ dinnerPlan: true }), true, 'exists');
    assert.strictEqual(G.checkConditions({ notThere: 'yes' }), false);
    assert.strictEqual(G.checkConditions({ notThere: false }), true);
});

test('pets open their chat like comrades do', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const pet = new ctx.Pet(G.player.x, G.player.y, 'd', 'Dog');
    pet.cleanerAct();
    assert.strictEqual(G.player.talking, pet);
    assert.ok(pet.convoIndex >= 0);
    assert.strictEqual(pet.convoInnerDex, 0);
});

test('only comrades get a name from the name pool', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const before = G.nameRegistry.length;
    const chair = new ctx.Entity(0, 0, 'h', '#fff', 'Chair', 1, { loot: true });
    assert.strictEqual(chair.name, 'Chair');
    assert.strictEqual(G.nameRegistry.length, before);
});
