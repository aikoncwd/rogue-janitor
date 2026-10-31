const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

const keyEv = (key, keyCode) => ({ key, keyCode, preventDefault() {} });

test('default font size scales with the window height (about 40 rows)', () => {
    const ctx = bootHeadless();
    ctx.Game.screen.clientHeight = 600;
    assert.equal(ctx.Game.autoFontSize(), 15);
    ctx.Game.screen.clientHeight = 1300;
    assert.equal(ctx.Game.autoFontSize(), 32);
    ctx.Game.screen.clientHeight = 300;
    assert.equal(ctx.Game.autoFontSize(), ctx.Game.MIN_FONT);
});

test('+ and - change the font size, applied to the display and remembered', () => {
    const ctx = bootHeadless({ begin: true });
    const start = ctx.Game.fontSize;
    ctx.Game.onKey(keyEv('+', 187));
    assert.equal(ctx.Game.fontSize, start + 2);
    assert.equal(ctx.__displayOptions.fontSize, start + 2);
    assert.equal(ctx.__storage['rj-font'], String(start + 2));
    ctx.Game.onKey(keyEv('-', 189));
    ctx.Game.onKey(keyEv('-', 109)); // numpad minus
    assert.equal(ctx.Game.fontSize, start - 2);
    assert.equal(ctx.Game.phase, 'intro', 'zoom keys do not start the invasion');
});

test('zoom is clamped', () => {
    const ctx = bootHeadless({ begin: true });
    for (let i = 0; i < 60; i++) ctx.Game.onKey(keyEv('+', 187));
    assert.equal(ctx.Game.fontSize, ctx.Game.MAX_FONT);
    for (let i = 0; i < 60; i++) ctx.Game.onKey(keyEv('-', 189));
    assert.equal(ctx.Game.fontSize, ctx.Game.MIN_FONT);
});

test('0 resets to automatic and forgets the saved size', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.Game.onKey(keyEv('+', 187));
    ctx.Game.onKey(keyEv('0', 48));
    assert.equal(ctx.Game.fontSize, ctx.Game.autoFontSize());
    assert.equal(ctx.__storage['rj-font'], undefined);
});

test('a saved zoom level is used on the next visit', () => {
    const ctx = bootHeadless({ begin: false });
    ctx.__storage['rj-font'] = '26';
    assert.equal(ctx.Game.chooseFontSize(), 26);
    ctx.__storage['rj-font'] = 'garbage';
    assert.equal(ctx.Game.chooseFontSize(), ctx.Game.autoFontSize());
});

test('zoom works during the invasion and while cleaning', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.__press(13);
    const f = ctx.Game.fontSize;
    ctx.Game.onKey(keyEv('+', 187));
    assert.equal(ctx.Game.fontSize, f + 2);
    assert.equal(ctx.Game.phase, 'invasion');
    assert.equal(ctx.Invasion.fast, false);
});

test('panel shows the zoom hint', () => {
    const ctx = bootHeadless({ begin: true });
    ctx.__press(13);
    const text = ctx.Panel.lines('invasion', 60).join('\n');
    assert.ok(text.includes('[+/-] zoom'));
});

test('a resize before the game has started does not throw', () => {
    const ctx = bootHeadless({ game: false });
    ctx.Game.screen = ctx.document.getElementById('gameContainer');
    assert.equal(ctx.Game.display, null);
    assert.doesNotThrow(() => ctx.Game.getSize());
});
