const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless, toIntro } = require('./harness');

const ENTER = 13;

test('title theme on the title, how-to and story screens', () => {
    const ctx = bootHeadless({ begin: true });
    assert.equal(ctx.Game.musicTrack(), 'title');
    ctx.__press(ENTER);
    assert.equal(ctx.Game.phase, 'howto');
    assert.equal(ctx.Game.musicTrack(), 'title');
    ctx.__press(ENTER);
    assert.equal(ctx.Game.phase, 'intro');
    assert.equal(ctx.Game.musicTrack(), 'title');
});

test('invasion tune alternates by day', () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.__press(ENTER);
    assert.equal(ctx.Game.phase, 'invasion');
    assert.equal(ctx.Game.musicTrack(), 'invasion');
    ctx.Game.day = 2;
    assert.equal(ctx.Game.musicTrack(), 'invasion2');
    ctx.Game.day = 3;
    assert.equal(ctx.Game.musicTrack(), 'invasion');
});

test('cleaning tune alternates by day', () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.Invasion.instant = true;
    for (let i = 0; i < 4 && ctx.Game.phase != 'cleaning'; i++) ctx.__press(ENTER);
    assert.equal(ctx.Game.phase, 'cleaning');
    ctx.Game.player.talking = null;
    assert.equal(ctx.Game.musicTrack(), 'cleaning');
    ctx.Game.day = 2;
    assert.equal(ctx.Game.musicTrack(), 'cleaning2');
});

test('hand-over card keeps the night tune', () => {
    const ctx = toIntro(bootHeadless({ begin: true }));
    ctx.__press(ENTER);
    ctx.Invasion.stage = 'card';
    ctx.Game.day = 2;
    assert.equal(ctx.Game.musicTrack(), 'night');
});
