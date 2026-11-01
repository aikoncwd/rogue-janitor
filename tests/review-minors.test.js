// The deferred minors from the phase 3 reviews.
const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');

function cleaningDay(seed = 1234) {
    const ctx = toIntro(bootHeadless({ seed, begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    let n = 0;
    while (ctx.Game.player.talking && n++ < 50) { ctx.Game.player.talking.lastConvoChange = 0; ctx.__press(13); }
    return ctx;
}

function endTalk(ctx) {
    const t = ctx.Game.player.talking;
    if (t) {
        ctx.removeEventListener('keydown', t);
        ctx.removeEventListener('keypress', t);
        ctx.Game.player.talking = null;
    }
}

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

function wall(ctx, x, y) {
    ctx.Game.map[x + ',' + y] = new ctx.Tile(x, y, '#', '#ddd', '#777', false, false);
}

// 1. chat goal
test('the chat goal ticks the moment you talk to the third colleague', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: false }];
    G.monsterList.forEach(m => { m.playerTalkedToday = false; });
    const lounge = G.monsterList.filter(m => m.alive && m.retired && !m.tags.visitor && m.convos);
    assert.ok(lounge.length >= 3);
    lounge[0].playerTalkedToday = true;
    lounge[1].playerTalkedToday = true;
    lounge[2].cleanerAct();
    endTalk(ctx);
    assert.strictEqual(ctx.Objectives.list[0].done, true);
});

test('pets are friends, not colleagues: they do not count for the chat goal', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: false }];
    G.monsterList.forEach(m => { m.playerTalkedToday = false; });
    const lounge = G.monsterList.filter(m => m.alive && m.retired && !m.tags.visitor);
    lounge[0].playerTalkedToday = true;
    lounge[1].playerTalkedToday = true;
    const pet = ctx.AddPet(G.player.x + 2, G.player.y, 'dog');
    pet.cleanerAct();
    endTalk(ctx);
    assert.strictEqual(ctx.Objectives.chatted(), 2);
    assert.strictEqual(ctx.Objectives.list[0].done, false);
});

// 2. squeegee
test('the squeegee does not squeeze through the corner of a wall', () => {
    const ctx = cleaningDay();
    const { px, py } = openFloor(ctx);
    // puddle A at (px+1,py+1), puddle B at (px+2,py+2); the corner between them is walled
    wall(ctx, px + 2, py + 1);
    wall(ctx, px + 1, py + 2);
    ctx.makeMess(px + 1, py + 1, 'Water');
    ctx.makeMess(px + 2, py + 2, 'Water');
    const n = ctx.Game.player.squeegee((px + 1) + ',' + (py + 1));
    assert.strictEqual(n, 1);
    assert.ok(ctx.Game.map[(px + 2) + ',' + (py + 2)].mess, 'puddle B is still there');
});

test('the squeegee still goes diagonally across open floor', () => {
    const ctx = cleaningDay();
    const { px, py } = openFloor(ctx);
    ctx.makeMess(px + 1, py + 1, 'Water');
    ctx.makeMess(px + 2, py + 2, 'Water');
    assert.strictEqual(ctx.Game.player.squeegee((px + 1) + ',' + (py + 1)), 2);
});

test('the squeegee only spreads over floor', () => {
    const ctx = cleaningDay();
    const { px, py } = openFloor(ctx);
    wall(ctx, px + 2, py + 1);
    ctx.makeMess(px + 1, py + 1, 'Water');
    ctx.makeMess(px + 2, py + 1, 'Water'); // water "on" a wall
    assert.strictEqual(ctx.Game.player.squeegee((px + 1) + ',' + (py + 1)), 1);
});

// 3. panel in a short window
test('a short panel drops the minimap and the lounge list, never the help keys', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.comboActive = () => true;
    G.combo.count = 7;
    ctx.Objectives.list = [
        { type: 'spotless', room: 0, label: 'Leave it spotless', short: 'Spotless: Slightly Haunted Gallery of Many Doors', done: false },
        { type: 'chat', label: 'Chat with 3 colleagues', done: false },
    ];
    ctx.Rooms.at = () => 'the Slightly Haunted Gallery of Many Doors';
    for (const rows of [30, 26, 24, 22, 20]) {
        const lines = ctx.Panel.lines('cleaning', rows).map(strip);
        const text = lines.join('\n');
        assert.ok(lines.length <= rows, rows + ' rows');
        assert.match(text, /\[\?\] help/, rows + ' rows: ' + text);
        assert.match(text, /\[T\] music/, rows + ' rows');
        assert.match(text, /\[\+\/-\] zoom/, rows + ' rows');
        assert.match(text, /MESS LEFT/, rows + ' rows: ' + text);
        assert.match(text, /Day \d/, rows + ' rows');
    }
});

test('a very short panel still shows MESS LEFT with a count', () => {
    const ctx = cleaningDay();
    ctx.Game.comboActive = () => true;
    ctx.Game.combo.count = 7;
    for (const rows of [11, 12, 13, 15]) {
        const lines = ctx.Panel.lines('cleaning', rows).map(strip);
        const i = lines.findIndex(l => /MESS LEFT/.test(l));
        assert.ok(i >= 0, rows + ' rows: ' + lines.join('\n'));
        assert.match(lines[i + 1] || '', /\d|Spotless/, rows + ' rows: ' + lines.join('\n'));
        assert.ok(lines.some(l => /\[\?\] help/.test(l)));
        assert.ok(lines.length <= rows);
    }
});

// 4. lounge spots and secret doors
test('nothing is put up right in front of a secret door', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const spots = ctx.Shop.loungeSpots();
    // a corner spot (5 walls): it keeps 4 walls even with a secret door next to it
    const spot = spots.find(([x, y]) => {
        let walls = 0;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            const n = G.map[(x + i) + ',' + (y + j)];
            if (n && !n.passable) walls++;
        }
        return walls >= 5;
    });
    assert.ok(spot, 'a corner spot');
    const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => G.map[(spot[0] + a) + ',' + (spot[1] + b)]).find(n => n && !n.passable);
    side.secretDoor = { door: '+', char: '+', color: '#fff', bgColor: '#000', sound: 'creak' };
    assert.ok(!ctx.Shop.loungeSpots().some(([x, y]) => x == spot[0] && y == spot[1]));
});

test('a secret door is not a wall for lounge decorations', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const spot = ctx.Shop.loungeSpots().find(([x, y]) => {
        let walls = 0;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            const n = G.map[(x + i) + ',' + (y + j)];
            if (n && !n.passable) walls++;
        }
        return walls == 3;
    });
    assert.ok(spot, 'a spot against a straight wall');
    // turn one of its three walls into a secret door
    let done = false;
    for (let i = -1; i <= 1 && !done; i++) for (let j = -1; j <= 1 && !done; j++) {
        const n = G.map[(spot[0] + i) + ',' + (spot[1] + j)];
        if (n && !n.passable) { n.secretDoor = { door: '+', char: '+', color: '#fff', bgColor: '#000', sound: 'creak' }; done = true; }
    }
    const again = ctx.Shop.loungeSpots().some(([x, y]) => x == spot[0] && y == spot[1]);
    assert.strictEqual(again, false);
});

// 5. decorations that did not fit
test('decorations that did not fit say "no room today"', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    const total = ctx.Decor.MAX + 3;
    for (let i = 0; i < total; i++) {
        G.inventory.push({ kind: 'decor', id: 'd' + i, name: 'Gnome ' + i, desc: 'A gnome.', placed: true });
    }
    const n = ctx.Decor.place();
    assert.ok(n <= ctx.Decor.MAX && n < total);
    const text = ctx.Inventory.lines().map(strip).join('\n');
    assert.strictEqual((text.match(/\[in the lounge\]/g) || []).length, n, text);
    assert.strictEqual((text.match(/no room today/g) || []).length, total - n, text);
});

// 6. toast on a narrow map
test('the achievement toast stays inside a narrow map', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Achievements.got = {};
    ctx.Achievements.unlock('petting');
    G.layoutInfo.mapCols = 14;
    ctx.__drawn.length = 0;
    ctx.Achievements.drawToast();
    assert.ok(ctx.__drawn.length > 0, 'something drawn');
    for (const d of ctx.__drawn) {
        const w = d.text != null ? strip(d.text).replace(/%b\{[^}]*\}/g, '').length : 1;
        assert.ok(d.x >= 0 && d.x + w <= 14, JSON.stringify(d));
    }
});

// 7. soot on important tiles
test('the dragon\'s soot never lands on important tiles', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 3;
    ctx.DayEvents.run('dragon');
    const d = ctx.DayEvents.dragon;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const t = G.map[(d.x + a) + ',' + (d.y + b)];
        if (t && t !== G.map[d.x + ',' + d.y]) t.important = true;
    }
    for (let k = 0; k < 6; k++) {
        G.turnCount = ctx.DayEvents.DRAGON_PUFF_EVERY * (k + 1);
        ctx.DayEvents.tick();
    }
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const t = G.map[(d.x + a) + ',' + (d.y + b)];
        assert.ok(!(t && t.mess && t.mess.kind == 'Soot'), 'soot at ' + a + ',' + b);
    }
});

// 8. the intern and doors
test('the intern does not stop in a doorway', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    G.day = 2;
    ctx.DayEvents.run('intern');
    const it = ctx.DayEvents.intern;
    assert.ok(it);
    const p = G.player;
    // the tile the player just left is an open door
    const dx = p.x + 1, dy = p.y;
    const t = G.map[dx + ',' + dy];
    t.entity = null; t.mess = null; t.door = '-'; t.open = true; t.passable = true;
    p.prevX = dx; p.prevY = dy;
    if (Math.max(Math.abs(it.x - p.x), Math.abs(it.y - p.y)) <= 1) throw new Error('intern too close for this test');
    const [ix, iy] = [it.x, it.y];
    ctx.DayEvents.tick();
    assert.notDeepStrictEqual([it.x, it.y], [dx, dy]);
    assert.deepStrictEqual([it.x, it.y], [ix, iy]);
});

// 9. torchlight and walls
function litRoom(ctx) {
    const G = ctx.Game;
    const px = G.player.x, py = G.player.y;
    for (let i = -4; i <= 4; i++) for (let j = -6; j <= 4; j++) {
        if (i == 0 && j == 0) { G.map[px + ',' + py].mess = null; continue; }
        const isWall = Math.abs(i) == 4 || j == 4 || j == -4;
        G.map[(px + i) + ',' + (py + j)] = new ctx.Tile(px + i, py + j, isWall ? '#' : '.', '#ddd', isWall ? '#777' : '#000', !isWall, !isWall);
    }
    const torch = ctx.GetEntity('Torch', px, py - 3);
    return { px, py, torch };
}

test('torchlight does not go through the wall it hangs on', () => {
    const ctx = cleaningDay();
    const { px, py, torch } = litRoom(ctx);
    assert.deepStrictEqual([torch.x, torch.y], [px, py - 4]);
    assert.ok(ctx.Game.warmth(px, py - 3, [torch]) > 0, 'its own side is warm');
    assert.strictEqual(ctx.Game.warmth(px, py - 5, [torch]), 0, 'the other side stays dark');
});

test('torchlight does not go round a pillar', () => {
    const ctx = cleaningDay();
    const { px, py, torch } = litRoom(ctx);
    wall(ctx, px, py - 2);
    assert.strictEqual(ctx.Game.warmth(px, py - 1, [torch]), 0);
    assert.ok(ctx.Game.warmth(px + 1, py - 3, [torch]) > 0);
});

test('torchlight reaches along the wall it hangs on', () => {
    const ctx = cleaningDay();
    const { px, py, torch } = litRoom(ctx);
    for (const dx of [-3, -2, -1, 1, 2, 3]) {
        assert.ok(ctx.Game.warmth(px + dx, py - 3, [torch]) > 0, 'dx ' + dx);
    }
});

test('torchlight drawing does not use the world RNG', () => {
    const ctx = cleaningDay();
    litRoom(ctx);
    const state = JSON.stringify(ctx.ROT.RNG.getState());
    ctx.Game.drawMap();
    assert.strictEqual(JSON.stringify(ctx.ROT.RNG.getState()), state);
});

// 10. shop and inventory own the letters
for (const screen of ['Shop', 'Inventory']) {
    test(screen + ': T and V do not toggle music and sound while it is open', () => {
        const ctx = cleaningDay();
        if (screen == 'Shop') ctx.Shop.openShop(); else ctx.Inventory.openInv();
        const music = ctx.Music.enabled, sfx = ctx.Sfx.enabled;
        ctx.__press(84, 0, 't');
        ctx.__press(86, 0, 'v');
        assert.strictEqual(ctx.Music.enabled, music);
        assert.strictEqual(ctx.Sfx.enabled, sfx);
    });
}

test('inventory letters skip capital I and X too', () => {
    const ctx = bootHeadless();
    const letters = ctx.Inventory.letters();
    for (const c of ['i', 'x', 'I', 'X']) assert.ok(!letters.includes(c), c);
});

// 11. manual zoom without localStorage
test('a manual zoom survives the morning even without localStorage', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.localStorage.setItem = () => { throw new Error('blocked'); };
    ctx.localStorage.getItem = () => null;
    ctx.localStorage.removeItem = () => { throw new Error('blocked'); };
    G.setFontSize(G.MIN_FONT + 2, true);
    assert.strictEqual(G.manualZoom, true);
    G.fitFontSize = () => G.MIN_FONT + 6;
    G.applyAutoZoom();
    assert.strictEqual(G.fontSize, G.MIN_FONT + 2);
    G.setFontSize(G.MIN_FONT + 4, false); // 0 = automatic again
    assert.strictEqual(G.manualZoom, false);
    G.applyAutoZoom();
    assert.strictEqual(G.fontSize, G.MIN_FONT + 6);
});

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

// 13. a new run forgets yesterday's memo
test('a new run clears the goals and the room names', () => {
    const ctx = cleaningDay();
    const G = ctx.Game;
    ctx.Objectives.list = [{ type: 'chat', label: 'Chat with 3 colleagues', done: true }];
    G.roomNames = ['STALE'];
    G.newRun();
    assert.strictEqual(ctx.Objectives.list.length, 0);
    assert.ok(!(G.roomNames || []).includes('STALE'));
});

// 14. the toast timer naps while it cannot show
for (const what of ['talking', 'Shop', 'Inventory']) {
    test('the toast timer stops while ' + what + ' hides it', () => {
        const ctx = cleaningDay();
        const G = ctx.Game;
        ctx.Achievements.got = {};
        ctx.Achievements.unlock('petting');
        if (what == 'talking') G.player.talking = { name: 'someone' };
        else if (what == 'Shop') ctx.Shop.isOpen = true;
        else ctx.Inventory.isOpen = true;
        ctx.Achievements.scheduleRedraw();
        G.drawMap = () => {}; // the screen itself is not the point here
        ctx.__runTimers();
        assert.strictEqual(ctx.Achievements.timer, null);
    });
}
