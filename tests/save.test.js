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
    while (ctx.Game.player.talking && n++ < 50) {
        ctx.Game.player.talking.lastConvoChange = 0;
        ctx.__press(13);
    }
    return ctx;
}

function signature(ctx) {
    const G = ctx.Game;
    return Object.keys(G.map).sort().map(k => k + ':' + G.map[k].char).join('|');
}

function names(ctx) {
    return ctx.Game.monsterList.map(m => m.name + '/' + m.playerInteractions).join(',');
}

// Day 1 played a little, then the night: A goes straight on, and its save is returned.
function playDayOne() {
    const A = cleaningDay(1234);
    const G = A.Game;
    const m = G.monsterList.find(x => x.alive && x.retired && !x.partying && !x.tags.visitor);
    m.playerInteractions += 2;
    G.convoTags.paint = 'blue';
    G.zorkmids = 17;
    G.nextDay();
    return A;
}

function continueFrom(storage, seed = 999) {
    const B = bootHeadless({ seed, begin: true });
    Object.assign(B.__storage, storage);
    B.Game.drawMap();
    B.__press(67, 99); // c
    return B;
}

test('continue regenerates the same day', () => {
    const A = playDayOne();
    assert.ok('rj-save' in A.__storage, 'saved at the start of day 2');
    const B = continueFrom(A.__storage);
    assert.strictEqual(B.Game.day, 2);
    assert.strictEqual(B.Game.phase, 'invasion');
    assert.strictEqual(B.Game.convoTags.paint, 'blue');
    assert.strictEqual(B.Game.zorkmids, 17);
    assert.strictEqual(B.Game.dungeonRooms, A.Game.dungeonRooms);
    assert.strictEqual(signature(B), signature(A));
    assert.strictEqual(names(B), names(A));
    assert.strictEqual(B.Game.player.cutscene, null, 'no first-day welcome again');
});

test('a continued day plays through to the next morning', () => {
    const A = playDayOne();
    const B = continueFrom(A.__storage);
    B.Invasion.instant = true;
    B.Invasion.skip();
    let n = 0;
    while (B.Game.phase != 'cleaning' && n++ < 10) B.__press(13);
    n = 0;
    while (B.Game.player.talking && n++ < 50) { B.Game.player.talking.lastConvoChange = 0; B.__press(13); }
    assert.strictEqual(B.Game.phase, 'cleaning');
    const lounge = B.Game.monsterList.filter(m => m.alive && m.retired);
    assert.ok(lounge.length > 0, 'comrades in the lounge');
    B.Game.nextDay();
    assert.strictEqual(B.Game.day, 3);
});

test('entities survive the round trip', () => {
    const A = cleaningDay(77);
    const G = A.Game;
    const m = G.monsterList.find(x => x.alive && !x.tags.visitor);
    A.QuestMess(m, G.player.x, G.player.y);
    assert.ok(m.questItem);
    m.questItem.droppedBy = m; // a reference back to its owner (a cycle)
    const pet = new A.Pet(G.player.x, G.player.y, 'd', 'Dog');
    G.playerPet = pet;
    const data = JSON.parse(JSON.stringify(A.Save.snapshot()));
    A.Save.restore(data);
    const i = G.monsterList.findIndex(x => x.name === m.name);
    const m2 = G.monsterList[i];
    assert.ok(m2 instanceof A.Entity);
    assert.notStrictEqual(m2, m, 'a fresh object');
    assert.strictEqual(m2.playerInteractions, m.playerInteractions);
    assert.ok(m2.questItem instanceof A.Mess);
    assert.strictEqual(m2.questItem.droppedBy, m2);
    assert.ok(G.playerPet instanceof A.Pet);
    assert.strictEqual(G.playerPet, G.petList[G.petList.indexOf(G.playerPet)]);
    assert.ok(G.petList.indexOf(G.playerPet) >= 0);
});

test('a broken save is discarded kindly', () => {
    for (const bad of ['{oops', JSON.stringify({ version: 0 }), JSON.stringify({ version: 1 })]) {
        const B = bootHeadless({ seed: 3, begin: true });
        B.__storage['rj-save'] = bad;
        assert.strictEqual(B.Save.exists(), false, bad);
        B.Game.drawMap();
        const text = B.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
        assert.ok(B.Flavor.pools.saveLost.some(l => text.includes(l)), 'kind line shown for ' + bad);
        assert.ok(!/Continue/.test(text));
    }
});

test('new game clears the save', () => {
    const A = playDayOne();
    const B = bootHeadless({ seed: 5, begin: true });
    Object.assign(B.__storage, A.__storage);
    B.Game.drawMap();
    const text = B.__drawn.filter(d => d.text).map(d => strip(d.text)).join('\n');
    assert.match(text, /\[c\] Continue: day 2/);
    assert.match(text, /\[n\] New game/);
    B.__press(78, 110); // n
    assert.ok(!('rj-save' in B.__storage));
    assert.strictEqual(B.Game.day, 1);
    assert.strictEqual(B.Game.phase, 'howto');
});

test('other keys do nothing on the title when a save exists', () => {
    const A = playDayOne();
    const B = bootHeadless({ seed: 5, begin: true });
    Object.assign(B.__storage, A.__storage);
    B.__press(65, 97); // a
    assert.strictEqual(B.Game.phase, 'title');
});

test('no storage still works', () => {
    const A = cleaningDay(8);
    A.localStorage.setItem = () => { throw new Error('quota'); };
    A.localStorage.getItem = () => { throw new Error('denied'); };
    A.Invasion.instant = true;
    assert.doesNotThrow(() => A.Game.nextDay());
    assert.strictEqual(A.Save.exists(), false);
});

test('a save with broken fields never freezes the title', () => {
    const A = playDayOne();
    const good = JSON.parse(A.__storage['rj-save']);
    const breakers = [
        d => { delete d.convoTags; },
        d => { d.run = {}; },
        d => { delete d.pastHeroes; },
        d => { delete d.yendorPoints; },
        d => { d.rng = [1]; },
        d => { d.world.monsterList[0].__t = 'Spaceship'; },
        d => { d.world.monsterList.push({ __ref: 9999 }); },
    ];
    for (const br of breakers) {
        const d = JSON.parse(JSON.stringify(good));
        br(d);
        const B = bootHeadless({ seed: 5, begin: true });
        B.__storage['rj-save'] = JSON.stringify(d);
        const day = B.Game.day;
        assert.doesNotThrow(() => B.__press(67, 99), br.toString());
        // rejected when the title is drawn (no Continue offered: c clocks in as any key), or when c is pressed
        assert.ok(B.Game.phase == 'title' || B.Game.phase == 'howto', br.toString());
        assert.strictEqual(B.Game.day, day, 'Game untouched: ' + br.toString());
        if (B.Game.phase == 'title') assert.ok(B.Title.timer != null, 'title still animating: ' + br.toString());
        assert.ok(!('rj-save' in B.__storage), 'bad save cleared');
        assert.ok(B.Save.problem, 'kind line ready');
    }
});

test('the lost-save line is shown once, not after every later run', () => {
    const B = bootHeadless({ seed: 5, begin: true });
    B.__storage['rj-save'] = '{oops';
    B.Save.exists();
    assert.ok(B.Save.problem);
    B.Game.newRun();
    assert.strictEqual(B.Save.problem, null);
});
