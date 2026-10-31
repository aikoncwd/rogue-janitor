const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function freshDungeon(seed = 1234) {
    const ctx = bootHeadless({ seed });
    ctx.Game.generateDungeon();
    return ctx;
}

function cleaningDay(seed = 1234) {
    const ctx = freshDungeon(seed);
    ctx.Game.phase = 'invasion';
    ctx.Invasion.instant = true;
    ctx.Game.engine.start();
    ctx.Game.player.talking = null;
    ctx.Sfx.play = () => true;
    return ctx;
}

// Empties the 3x3 around the player and puts one mess right of them.
function messRight(ctx, type) {
    const p = ctx.Game.player;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const t = ctx.Game.map[(p.x + i) + ',' + (p.y + j)];
        if (t) { t.mess = null; t.secretDoor = null; }
    }
    const t = ctx.Game.map[(p.x + 1) + ',' + p.y];
    t.entity = null; t.passable = true; t.important = false; t.door = null;
    return { tile: t, mess: ctx.makeMess(p.x + 1, p.y, type) };
}

const lightness = (ctx, hex) => ctx.ROT.Color.rgb2hsl(ctx.ROT.Color.fromString(hex))[2];
const saturation = (ctx, hex) => ctx.ROT.Color.rgb2hsl(ctx.ROT.Color.fromString(hex))[1];

// ---------------------------------------------------------------- tough stains

test('acid needs three passes, shown bright and saturated, darker after every pass', () => {
    const ctx = cleaningDay();
    const { tile, mess } = messRight(ctx, 'AcidPool');
    assert.equal(mess.passes, 3);
    assert.ok(saturation(ctx, mess.color) > 0.95, 'saturated');
    const before = ctx.Game.messNumbers[0];
    const l = [lightness(ctx, mess.color)];
    ctx.Game.player.clean('mop');
    assert.equal(tile.mess, mess, 'still there after one pass');
    l.push(lightness(ctx, mess.color));
    ctx.Game.player.clean('mop');
    assert.equal(tile.mess, mess);
    l.push(lightness(ctx, mess.color));
    assert.ok(l[0] > l[1] && l[1] > l[2], 'darker each pass: ' + l);
    assert.equal(ctx.Game.messNumbers[0], before, 'not counted as cleaned yet');
    ctx.Game.player.clean('mop');
    assert.equal(tile.mess, null);
    assert.equal(ctx.Game.messNumbers[0], before - 1);
    assert.equal(ctx.Game.shift.passes, 2);
    assert.equal(ctx.Game.shift.cleaned, 1);
    assert.ok(ctx.Game.log.lines.some(l => /stubborn|fading/.test(l.text)));
});

test('ordinary messes still go in one pass and keep their colour', () => {
    const ctx = cleaningDay();
    const { tile, mess } = messRight(ctx, 'Water');
    assert.equal(mess.color, '#00f');
    ctx.Game.player.clean('mop');
    assert.equal(tile.mess, null);
});

test('examining a tough stain says how many passes are left', () => {
    const ctx = cleaningDay();
    const { mess } = messRight(ctx, 'Graffiti');
    assert.match(mess.getAction(), /3 passes left/);
});

// ---------------------------------------------------------------- monsters

test('new monsters exist with their own glyphs, levels and messes', () => {
    const ctx = freshDungeon();
    const spec = {
        Myconid: ['m', 1, 'Spores'], Harpy: ['Y', 2, 'Loose Feathers'], Mimic: ['π', 2, 'Mimic Drool'],
        Skeleton: ['Z', 3, 'Bone Dust'], Ghost: ['G', 3, 'Ectoplasm'],
    };
    for (const [name, [ch, level, mess]] of Object.entries(spec)) {
        const key = ctx.Game.freeCells.find(k => ctx.Game.map[k].entity == null && !ctx.Game.map[k].important);
        const [x, y] = key.split(',').map(Number);
        const m = ctx.GetEntity(name, x, y);
        assert.equal(m.char, ch, name);
        assert.equal(m.level, level, name);
        if (m.tags.bleeds) assert.equal(ctx.makeMess(x, y, m.tags.bleeds).name, mess === 'Loose Feathers' ? 'Spores' : mess);
        if (m.tags.rangeMess) assert.ok(ctx.makeMess(x, y, m.tags.rangeMess).name);
    }
});

test('every species has something of its own to say', () => {
    const ctx = freshDungeon();
    for (const sp of ['Myconid', 'Harpy', 'Mimic', 'Skeleton', 'Ghost', 'Slime']) {
        const src = ctx.ConversationBuilder.randomGeneric.toString();
        assert.ok(src.includes("'" + sp + "'"), sp + ' has dialogue');
    }
});

// ---------------------------------------------------------------- heroes

test('hero classes set colour and stats, and every class makes its own mess', () => {
    const ctx = freshDungeon();
    const a = ctx.Game.adventurer;
    for (const cls of Object.keys(ctx.Adventurer.classes)) {
        a.setClass(cls);
        assert.equal(a.color, ctx.Adventurer.classes[cls].color);
        assert.ok(ctx.Flavor.pools.heroClass.includes(cls), cls + ' can be rolled');
        assert.ok(ctx.Flavor.pools['special_' + cls].length >= 3, cls + ' has flavor lines');
        const before = ctx.Game.messNumbers[1];
        // stand in the middle of a room so there is floor around
        const c = ctx.Game.getCenter(0);
        a.x = c[0]; a.y = c[1];
        for (const k of Object.keys(ctx.Game.map)) ctx.Game.map[k].mess = null;
        assert.equal(a[ctx.Adventurer.classes[cls].special](), true, cls);
        assert.ok(ctx.Game.messNumbers[1] > before, cls + ' made a mess');
    }
});

test('the invasion rolls a class for the hero and reports its special', () => {
    const ctx = cleaningDay(99);
    const a = ctx.Game.adventurer;
    assert.ok(a.heroClass in ctx.Adventurer.classes);
    assert.equal(ctx.Invasion.hero.cls, a.heroClass);
    assert.equal(a.char, '@');
    const scene = ctx.Game.monsterList[0].convos[ctx.Game.monsterList[0].convos.length - 1];
    const stat = ctx.Adventurer.classes[a.heroClass].stat;
    assert.ok(scene.some(n => n.message && n.message.startsWith(stat + ':')), stat);
});

// ---------------------------------------------------------------- requests

test('a comrade can ask for a favour, and thanks you once that mess is all gone', () => {
    const ctx = cleaningDay();
    const R = ctx.Requests;
    const m = ctx.Game.monsterList.find(x => x.alive && x.retired && !x.partying);
    // make sure there is exactly some graffiti to clean
    for (const t of Object.values(ctx.Game.map)) if (t.mess && t.mess.name === 'Graffiti') t.mess = null;
    const wall = Object.values(ctx.Game.map).find(t => !t.passable && t.char === '#' && t.mess == null);
    ctx.makeMess(wall.x !== undefined ? Number(Object.keys(ctx.Game.map).find(k => ctx.Game.map[k] === wall).split(',')[0]) : 0,
        Number(Object.keys(ctx.Game.map).find(k => ctx.Game.map[k] === wall).split(',')[1]), 'Graffiti');
    assert.equal(R.remaining('graffiti'), 1);
    m.convoTags.request = 'graffiti';
    assert.equal(R.isDone(m), false);
    assert.equal(ctx.Game.checkConditions({ requestDone: true }, m), false);
    assert.deepEqual(R.active().map(r => [r.label, r.left]), [['Graffiti', 1]]);
    wall.mess = null;
    assert.equal(R.isDone(m), true);
    assert.equal(ctx.Game.checkConditions({ requestDone: true }, m), true);
    m.convoTags.requestThanked = true;
    assert.equal(R.isDone(m), false, 'only thanks you once');
});

test('species favours go to the right species; offers are capped per day', () => {
    const ctx = cleaningDay();
    const R = ctx.Requests;
    ctx.Game.requestsOffered = 0;
    ctx.ROT.RNG.getUniform = () => 0; // always offer
    const key = ctx.Game.freeCells.find(k => ctx.Game.map[k].entity == null && !ctx.Game.map[k].important);
    const [x, y] = key.split(',').map(Number);
    for (const t of Object.values(ctx.Game.map)) if (t.mess && t.mess.name === 'Spores') t.mess = null;
    ctx.Game.map[key].mess = null;
    ctx.makeMess(x, y, 'Spores');
    const myconid = { species: 'Myconid', convoTags: {} };
    assert.equal(R.pick(myconid).key, 'spores');
    assert.notEqual((R.pick({ species: 'Goblin', convoTags: {} }) || {}).key, 'spores');
    const convos = [];
    for (let i = 0; i < 5; i++) R.offer(myconid, convos);
    assert.equal(convos.length, 2 * R.MAX_PER_DAY);
});

test('finishing a favour counts towards the shift report', () => {
    const ctx = cleaningDay();
    const m = ctx.Game.monsterList.find(x => x.alive);
    m.convos = [[{ text: 'thanks', any: -1, tags: { requestThanked: true } }]];
    m.convoIndex = 0; m.convoInnerDex = 0;
    ctx.Game.player.talking = m;
    m.doConvo();
    assert.equal(ctx.Game.shift.requestsDone, 1);
});

// ---------------------------------------------------------------- shift report

test('the shift report has the grade, counts and best score, and records a new best', () => {
    const ctx = cleaningDay();
    ctx.Game.shift.cleaned = 12;
    assert.match(ctx.Game.shiftReport(), /Clean a bit more/, '0% is never a best');
    ctx.Game.cleanPercent = () => 42;
    const report = ctx.Game.shiftReport();
    assert.match(report, /Shift report, day 1/);
    assert.match(report, /Grade: %c\{#ff0\}[SABCD]/);
    assert.match(report, /Messes cleaned: 12/);
    assert.match(report, /New personal best/);
    assert.equal(JSON.parse(ctx.__storage['rj-best']).pct, 42);
    assert.match(ctx.Game.shiftReport(), /Best shift so far/);
});

test('the exit prompt includes the shift report', () => {
    const ctx = cleaningDay();
    const scene = ctx.ConversationBuilder.exitPrompt();
    assert.ok(scene.some(n => n.message && /Shift report/.test(n.message)));
});

// ---------------------------------------------------------------- panel

test('nearest mess points the right way', () => {
    const ctx = cleaningDay();
    for (const t of Object.values(ctx.Game.map)) t.mess = null;
    const p = ctx.Game.player;
    const key = Object.keys(ctx.Game.map).find(k => {
        const [x, y] = k.split(',').map(Number);
        return x === p.x + 3 && y === p.y && ctx.Game.map[k].passable;
    }) || (p.x + 3) + ',' + p.y;
    if (!ctx.Game.map[key]) ctx.Game.map[key] = new ctx.Tile(p.x + 3, p.y, '.', '#fff', '#000', true, true);
    ctx.Game.map[key].passable = true; ctx.Game.map[key].important = false;
    ctx.makeMess(p.x + 3, p.y, 'Wrapper');
    const n = ctx.Game.nearestMess();
    assert.equal(n.d, 3);
    assert.equal(n.arrow, '→');
});

test('minimap marks the janitor and spotted mess', () => {
    const ctx = cleaningDay();
    for (const t of Object.values(ctx.Game.map)) t.lastSeen = '.';
    const lines = ctx.Panel.minimap(23, 9);
    const text = lines.join('');
    assert.ok(lines.length > 0 && lines.length <= 9);
    assert.ok(text.includes('@'));
    assert.ok(text.includes('▪'));
    for (const l of lines) assert.ok(l.replace(/%c\{[^}]*\}/g, '').length <= 23);
});

test('panel shows requests, nearest mess, the map and the music hint when there is room', () => {
    const ctx = cleaningDay();
    for (const t of Object.values(ctx.Game.map)) t.lastSeen = '.';
    const m = ctx.Game.monsterList.find(x => x.alive && x.retired && !x.partying);
    m.convoTags.request = 'cobwebs';
    const strip = s => s.replace(/%c\{[^}]*\}/g, '');
    const text = ctx.Panel.lines('cleaning', 70).map(strip).join('\n');
    assert.match(text, /REQUESTS/);
    assert.match(text, /Cobwebs/);
    assert.match(text, /Nearest mess|No mess left/);
    assert.match(text, /── MAP ──/);
    assert.match(text, /\[T\] music/);
    const small = ctx.Panel.lines('cleaning', 25).map(strip).join('\n');
    assert.ok(!/── MAP ──/.test(small), 'no minimap when space is short');
});

// ---------------------------------------------------------------- music wiring

test('T toggles music and each phase picks a fitting track', () => {
    const ctx = bootHeadless({ begin: true });
    const played = [];
    ctx.Music.play = name => { played.push(name); return true; };
    ctx.Game.drawMap();
    assert.equal(played[played.length - 1], 'night', 'intro is quiet');
    const before = ctx.Music.enabled;
    ctx.__press(84);
    assert.equal(ctx.Music.enabled, !before);
    assert.equal(ctx.Game.phase, 'intro', 'T does not start the game');
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Game.drawMap();
    assert.equal(played[played.length - 1], 'cleaning');
});

// ---------------------------------------------------------------- bug fixes

test('walking into a secret door is worth the same as cleaning it open', () => {
    const ctx = cleaningDay();
    const p = ctx.Game.player;
    const t = ctx.Game.map[(p.x + 1) + ',' + p.y];
    t.mess = null; t.entity = null;
    t.secretDoor = { door: '-', char: '+', color: '#fff', bgColor: '#000', sound: '' };
    const before = ctx.Game.yendorPoints;
    p.moveTo(p.x + 1, p.y);
    assert.equal(ctx.Game.yendorPoints, before + 10);
});

test('blood splashing on a wall does not wipe off graffiti', () => {
    const ctx = freshDungeon();
    const key = Object.keys(ctx.Game.map).find(k => !ctx.Game.map[k].passable && ctx.Game.map[k].char === '#');
    const [x, y] = key.split(',').map(Number);
    ctx.makeMess(x, y, 'Graffiti');
    ctx.makeMess(x, y, 'BloodPool');
    assert.equal(ctx.Game.map[key].mess.name, 'Graffiti');
});

test('entities placed far from free floor still find a spot instead of looping forever', () => {
    const ctx = freshDungeon();
    const c = ctx.Game.corners;
    const e = ctx.GetEntity('Table', c[1][0] + 3, c[1][1] + 3); // just outside the map
    assert.ok(ctx.Game.map[e.x + ',' + e.y], 'ended up on the map');
});
