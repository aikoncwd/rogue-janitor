const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function cleaningDay() {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    const played = [];
    ctx.Sfx.play = name => { played.push(name); return true; };
    return { ctx, played };
}

// Puts a mess of the given type on a free floor tile next to the player.
function messNextToPlayer(ctx, type) {
    const p = ctx.Game.player;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const t = ctx.Game.map[(p.x + dx) + ',' + (p.y + dy)];
        if (t && t.passable && !t.important && !t.door && t.entity == null) {
            t.mess = null;
            ctx.makeMess(p.x + dx, p.y + dy, type);
            return t;
        }
    }
    throw new Error('no free tile next to player');
}

test('mopping plays the mop sound', () => {
    const { ctx, played } = cleaningDay();
    messNextToPlayer(ctx, 'Water');
    ctx.Game.player.clean('mop');
    assert.deepEqual(played, ['mop']);
});

test('picking up plays the pickup sound', () => {
    const { ctx, played } = cleaningDay();
    messNextToPlayer(ctx, 'Wrapper');
    ctx.Game.player.clean('get');
    assert.deepEqual(played, ['pickup']);
});

test('fixing plays the fix sound', () => {
    const { ctx, played } = cleaningDay();
    const t = messNextToPlayer(ctx, 'BrokenTable');
    t.mess.parent = { name: 'Table' };
    ctx.Game.player.clean('fix');
    assert.deepEqual(played, ['fix']);
});

test('nothing to clean plays nothing', () => {
    const { ctx, played } = cleaningDay();
    const p = ctx.Game.player;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const t = ctx.Game.map[(p.x + dx) + ',' + (p.y + dy)];
        if (t) { t.mess = null; t.secretDoor = null; }
    }
    ctx.Game.player.clean('mop');
    assert.deepEqual(played, []);
});

test('opening a secret door plays the secret sound', () => {
    const { ctx, played } = cleaningDay();
    const t = messNextToPlayer(ctx, 'Wrapper');
    t.mess = null;
    t.secretDoor = { door: '+', char: '.', color: '#fff', bgColor: '#000', sound: '' };
    ctx.Game.player.clean('mop');
    assert.deepEqual(played.filter(s => s !== 'fanfareIn'), ['secret']); // the first secret also unlocks an achievement jingle
});
