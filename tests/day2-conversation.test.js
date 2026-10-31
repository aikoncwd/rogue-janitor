const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

// Plays day 1 instantly, then goes home through the real exit-stairs conversation
// and stops on its last node (the one that calls Game.nextDay()).
function onLastNightNode() {
    const ctx = toIntro(bootHeadless({ seed: 1234, begin: true }));
    const G = ctx.Game;
    ctx.Invasion.instant = true;
    ctx.__press(13);
    ctx.Invasion.instant = false;
    const fire = (type, keyCode, charCode) => {
        const ev = { keyCode, charCode, which: keyCode, preventDefault() {}, stopPropagation() {} };
        for (const l of ctx.__listeners.slice()) {
            if (l.type !== type) continue;
            if (typeof l.fn === 'function') l.fn(ev); else l.fn.handleEvent(ev);
        }
    };
    const press = k => { if (G.player.talking) G.player.talking.lastConvoChange = 0; fire('keydown', k, 0); };
    const type = ch => { if (G.player.talking) G.player.talking.lastConvoChange = 0; fire('keypress', 0, ch.charCodeAt(0)); };
    let n = 0;
    while (G.player.talking && n++ < 50) press(13);
    let exit = null;
    for (const k in G.map) { const e = G.map[k].entity; if (e && e.tags && 'exit' in e.tags) exit = e; }
    exit.cleanerAct();
    type('y');
    n = 0;
    while (G.phase === 'cleaning' && n++ < 20) press(13);
    assert.equal(G.phase, 'invasion');
    assert.ok(G.player.talking, 'still on the last night node');
    return { ctx, G, press };
}

for (const [name, code] of [['Enter', 13], ['Esc', 27], ['Backspace', 8], ['X', 88]]) {
    test(`closing the last night screen with ${name} starts a paced day-2 invasion`, () => {
        const { ctx, G, press } = onLastNightNode();
        press(code);
        assert.equal(G.phase, 'invasion');
        assert.equal(G.adventurer.turns, 0);
        assert.equal(ctx.__timers.length, 1);
        assert.equal(ctx.Invasion.skipping, false);
    });
}

test('space on the last night screen does not toggle fast mode', () => {
    const { ctx, press } = onLastNightNode();
    press(32);
    assert.equal(ctx.Invasion.fast, false);
});
