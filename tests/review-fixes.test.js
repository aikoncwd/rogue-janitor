const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

function cleaning() {
    const ctx = bootHeadless({ begin: true });
    ctx.Invasion.instant = true;
    ctx.__press(13);
    while (ctx.Game.player.talking) ctx.Game.player.talking.cancelConvo();
    return ctx;
}

test('M-6: browser keys on the intro screen do not start the invasion', () => {
    const ctx = bootHeadless({ begin: true });
    let prevented = 0;
    const ev = (keyCode, extra = {}) => Object.assign({ keyCode, preventDefault() { prevented++; } }, extra);
    for (const e of [ev(116), ev(123), ev(122), ev(16), ev(17), ev(18), ev(82, { ctrlKey: true }), ev(82, { metaKey: true }), ev(9, { altKey: true })]) {
        ctx.Game.onKey(e);
    }
    assert.equal(ctx.Game.phase, 'intro');
    assert.equal(prevented, 0);
    ctx.Game.onKey(ev(13));
    assert.equal(ctx.Game.phase, 'invasion');
});

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

test('M-2: examine messages are transient and do not flood the log', () => {
    const ctx = cleaning();
    const G = ctx.Game;
    G.log.push('Keep me');
    const before = G.log.lines.length;
    ctx.__press(88); // X: examine
    for (const k of [39, 39, 40, 40, 37, 38]) ctx.__press(k);
    assert.equal(G.log.lines.length, before, 'no examine lines added to the log');
    const logRows = ctx.__drawn.filter(d => d.text && d.y >= G.layoutInfo.logY).map(d => d.text).join('\n');
    assert.ok(/Floor|Wall|door|staircase|You can't see|the |It's you/.test(logRows), 'current examine text is shown');
    assert.ok(logRows.includes('Keep me'));
    ctx.__press(27); // leave examine
    const after = ctx.__drawn.filter(d => d.text && d.y >= G.layoutInfo.logY).map(d => d.text).join('\n');
    assert.ok(!/Floor\.|Wall\./.test(after), 'examine text disappears when examine ends');
});
