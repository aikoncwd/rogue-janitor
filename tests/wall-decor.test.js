const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

// A floor tile at 0,0 with a grey wall at 0,1.
function miniMap() {
    const ctx = bootHeadless();
    const G = ctx.Game;
    G.map = {};
    G.map['0,0'] = new ctx.Tile(0, 0, '.', '#ddd', '#000', true, true);
    G.map['0,1'] = new ctx.Tile(0, 1, '#', '#ddd', '#777', false, false);
    return ctx;
}

test('a wall torch takes its wall background', () => {
    const ctx = miniMap();
    const torch = ctx.GetEntity('Torch', 0, 0);
    assert.equal(torch.x + ',' + torch.y, '0,1');
    assert.equal(torch.bgColor, '#777');
    assert.equal(ctx.Game.map['0,1'].getArt()[2], '#777');
});

test('the exit door keeps its red background', () => {
    const ctx = miniMap();
    const exit = ctx.GetEntity('ExitDoor', 0, 0);
    assert.equal(exit.x + ',' + exit.y, '0,1');
    assert.equal(exit.bgColor, '#c33');
});
