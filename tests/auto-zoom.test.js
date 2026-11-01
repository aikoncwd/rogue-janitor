const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

// A display stub that knows how to fit a font: like rot.js, it scales with the
// requested grid (width x height) and the available pixels.
function withFontFit(ctx, pick) {
    const d = ctx.Game.display;
    d.computeFontSize = function (w, h) {
        const o = ctx.__displayOptions || {};
        return pick ? pick(o) : Math.floor(Math.min(w / (o.width * 0.6), h / o.height));
    };
    return ctx;
}

test('with no saved zoom the font fits the dungeon', () => {
    const ctx = withFontFit(bootHeadless({ seed: 3 }));
    const G = ctx.Game;
    let asked = null;
    G.display.computeFontSize = function (w, h) { asked = Object.assign({}, ctx.__displayOptions); return 14; };
    G.generateDungeon();
    const dw = G.corners[1][0] - G.corners[0][0] + 1;
    const dh = G.corners[1][1] - G.corners[0][1] + 1;
    assert.ok(asked.width >= dw + ctx.Panel.WIDTH, 'room for the dungeon and the panel');
    assert.ok(asked.height >= dh + ctx.Panel.LOG_ROWS, 'room for the dungeon and the log');
    assert.strictEqual(G.fontSize, 14);
});

test('a saved zoom wins', () => {
    const ctx = withFontFit(bootHeadless({ seed: 3 }), () => 14);
    const G = ctx.Game;
    ctx.__storage['rj-font'] = '22';
    G.fontSize = 22;
    G.generateDungeon();
    assert.strictEqual(G.fontSize, 22);
});

test('auto zoom is clamped', () => {
    let ctx = withFontFit(bootHeadless({ seed: 3 }), () => 3);
    ctx.Game.generateDungeon();
    assert.strictEqual(ctx.Game.fontSize, ctx.Game.MIN_FONT);
    ctx = withFontFit(bootHeadless({ seed: 3 }), () => 300);
    ctx.Game.generateDungeon();
    assert.ok(ctx.Game.fontSize <= ctx.Game.autoFontSize());
});

test('0 goes back to the fitted size', () => {
    const ctx = withFontFit(bootHeadless({ seed: 3 }), () => 13);
    const G = ctx.Game;
    G.generateDungeon();
    G.setFontSize(30, true);
    ctx.__press(48, 0, '0');
    assert.strictEqual(G.fontSize, 13);
    assert.ok(!('rj-font' in ctx.__storage));
});
