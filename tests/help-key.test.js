const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

function cleaning() {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.Invasion.instant = true;
    ctx.__press(13);                       // start + run the whole invasion
    while (ctx.Game.player.talking) {      // dismiss report and welcome cutscenes
        ctx.Game.player.talking.cancelConvo();
    }
    return ctx;
}

test('"?" opens help on a US keyboard (keyCode 191)', () => {
    const ctx = cleaning();
    ctx.__press(191, 0, '?');
    assert.equal(ctx.Game.player.instructions, true);
});

test('"?" opens and closes help on a Spanish keyboard (Shift + \' key, keyCode 219)', () => {
    const ctx = cleaning();
    ctx.__press(219, 0, '?');
    assert.equal(ctx.Game.player.instructions, true);
    ctx.__press(219, 0, '?');
    assert.equal(ctx.Game.player.instructions, false);
});

test('the Spanish "\'" key without Shift does not open help', () => {
    const ctx = cleaning();
    ctx.__press(219, 0, "'");
    assert.equal(ctx.Game.player.instructions, false);
});
