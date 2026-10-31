const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

const strip = s => s.replace(/%c\{[^}]*\}/g, '');
const keyEv = (key, keyCode) => ({ key, keyCode, preventDefault() {} });

function cleaning(seed = 1234) {
    const ctx = bootHeadless({ seed, begin: true });
    ctx.Invasion.instant = true;
    ctx.__press(13);
    while (ctx.Game.player.talking) ctx.Game.player.talking.cancelConvo();
    return ctx;
}

test('numpad 0 resets zoom to automatic', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.Game.onKey(keyEv('+', 187));
    ctx.Game.onKey(keyEv('0', 96)); // numpad 0, NumLock on
    assert.equal(ctx.Game.fontSize, ctx.Game.autoFontSize());
    ctx.Game.onKey(keyEv('+', 187));
    ctx.Game.onKey(keyEv('Insert', 96)); // numpad 0, NumLock off
    assert.equal(ctx.Game.fontSize, ctx.Game.autoFontSize());
});

test('M-3: the message log is hidden on black-screen night cutscenes', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    G.log.push('should not show at night');
    const m = G.monsterList.find(x => x.alive && x.retired);
    m.convos.push([{ message: 'You go home and sleep.', blackScreenMessage: true, any: -1 }]);
    m.convoIndex = m.convos.length - 1;
    m.convoInnerDex = 0;
    G.player.talking = m;
    G.drawMap();
    const texts = ctx.__drawn.filter(d => d.text).map(d => d.text).join('\n');
    assert.ok(texts.includes('You go home and sleep.'));
    assert.ok(!texts.includes('should not show at night'));
});

test('M-4: long log lines are truncated with an ellipsis instead of wrapping', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    G.log.push('%c{#0ff}Hero%c{} ' + 'blah '.repeat(60) + 'END');
    G.drawMap();
    const row = ctx.__drawn.filter(d => d.text && d.y >= G.layoutInfo.logY && strip(d.text).startsWith('Hero')).pop();
    const visible = strip(row.text);
    assert.ok(visible.endsWith('…'), visible.slice(-10));
    assert.ok(!visible.includes('END'));
    assert.ok(1 + visible.length <= G.layoutInfo.mapCols - 1, 'fits the map width');
    assert.ok(row.text.startsWith('%c{#0ff}Hero%c{}'), 'colours kept');
});

test('M-4: fitColored leaves short lines alone', () => {
    const ctx = bootHeadless();
    assert.equal(ctx.Panel.fitColored('%c{#f00}hi%c{} there', 20), '%c{#f00}hi%c{} there');
    assert.equal(strip(ctx.Panel.fitColored('%c{#f00}abcdef%c{}', 4)), 'abc…');
});

test('M-5: every panel line fits the panel, with sound on or off', () => {
    const ctx = cleaning();
    for (const on of [true, false]) {
        ctx.Sfx.enabled = on;
        for (const phase of ['cleaning', 'invasion']) {
            for (const l of ctx.Panel.lines(phase, 60)) {
                assert.ok(strip(l).length <= ctx.Panel.WIDTH - 1, phase + ': ' + strip(l));
            }
        }
    }
});

test('M-7: a stuck hero gives up after a few minutes of watching, not half an hour', () => {
    const ctx = bootHeadless();
    ctx.Game.generateDungeon();
    const a = ctx.Game.adventurer;
    assert.ok(a.maxTurns >= 1000 && a.maxTurns <= 2000, String(a.maxTurns));
    for (const seed of [1, 2, 3, 4, 5, 6]) {
        const c = bootHeadless({ seed });
        c.Game.generateDungeon();
        c.Game.phase = 'invasion';
        c.Invasion.instant = true;
        c.Game.engine.start();
        assert.ok(c.Game.adventurer.turns < c.Game.adventurer.maxTurns, 'normal invasions finish well before the cap');
    }
});

test('M-8: pets stay quiet during the invasion', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.__press(13);
    ctx.Game.lastMessage = '';
    const pet = { lastSeen: 0, sound: ['text', 'Woof'], name: 'Dog', animQueue: [], spreadCount: 0, home: {}, x: 0, y: 0 };
    ctx.ROT.RNG.getUniform = () => 0.99; // would always bark
    const before = ctx.Game.log.lines.length;
    try { ctx.Pet.prototype.act.call(pet); } catch (e) { /* movement code needs a real pet; only the bark matters */ }
    assert.equal(ctx.Game.log.lines.length, before);
});

test('M-9: the invasion report counts blood puddles', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.Invasion.instant = true;
    ctx.__press(13);
    const scene = ctx.Game.monsterList[0].convos[ctx.Game.monsterList[0].convos.length - 1];
    const line = scene.map(n => n.message).find(m => /Blood puddles/.test(m));
    assert.ok(line, scene.map(n => n.message).join(' / '));
    assert.equal(Number(line.match(/Blood puddles[^0-9]*(\d+)/)[1]), ctx.Invasion.stats.bloodPuddles);
    assert.ok(ctx.Invasion.stats.bloodPuddles > 0);
});

test('M-10: during the invasion only this turn\'s lines are bright', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.__press(13);
    for (let i = 0; i < 40; i++) ctx.__runTimers();
    const lines = ctx.Game.log.recent(5);
    assert.ok(lines.some(l => !l.fresh), 'older lines are dimmed');
});
