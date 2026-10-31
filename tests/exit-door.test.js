const test = require('node:test');
const assert = require('node:assert');
const { bootHeadless } = require('./harness');

test('the exit door never hides the secret door', () => {
    const ctx = bootHeadless();
    const G = ctx.Game;
    G.map = {};
    const T = (x, y, passable) => { G.map[x + ',' + y] = new ctx.Tile(x, y, passable ? '.' : '#', '#ddd', '#777', passable, passable); };
    T(0, 0, true); T(0, -1, true);
    T(0, 1, false);  // nearest wall... but it is the secret door
    G.map['0,1'].secretDoor = { char: '+', door: '-', color: '#ddd', bgColor: '#842', sound: null };
    T(0, -2, false); // a plain wall a bit further away
    const exit = ctx.GetEntity('ExitDoor', 0, 0);
    assert.notEqual(exit.x + ',' + exit.y, '0,1', 'exit sits on the secret door');
    assert.equal(exit.x + ',' + exit.y, '0,-2');
    assert.equal(G.map['0,1'].entity, null);
});
