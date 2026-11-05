// Silly traps hidden around the dungeon. The hero walks into them during the raid
// (a little mess and a sprung trap left behind) and the janitor re-arms them in the
// morning with [F]ix. Placed and sprung with ROT.RNG: the same night, watched or skipped.
var Traps = {
    MIN: 2,
    EXTRA: 3, // up to MIN + EXTRA - 1 traps a night
    KINDS: {
        glitter:  { name: 'Glitter Trap', color: '#f8f', sound: 'spray' },
        pie:      { name: 'Cream Pie Trap', color: '#ffd', sound: 'hit' },
        bucket:   { name: 'Bucket Trap', color: '#48f', sound: 'spray' },
        confetti: { name: 'Confetti Trap', color: '#ff5', sound: 'spray' },
        trapdoor: { name: 'Trap Door', color: '#a74', sound: 'door' },
        arrow:    { name: 'Arrow Trap (Rubber Tips)', color: '#ca8', sound: 'hit' },
        whoopee:  { name: 'Whoopee Cushion Trap', color: '#f88', sound: 'yelp' },
        bear:     { name: 'Plush Bear Trap', color: '#c96', sound: 'yelp' },
        rust:     { name: 'Rust Trap', color: '#c63', sound: 'spray' },
        sleep:    { name: 'Sleeping Gas Trap', color: '#aaf', sound: 'spray' },
    },

    // Floor tiles where the hero is likely to walk: near room centres and in corridors.
    spots: function () {
        let G = Game;
        let out = [];
        let ok = function (key) {
            let t = G.map[key];
            return t && t.passable && t.passThrough() && t.door == null && !t.important && t.mess == null && t.trap == null;
        };
        for (let i = 0; i < G.rooms.length; i++) {
            // (the party room and petting zoo are only built after the raid; their ids
            // are still yesterday's here, so they must not be looked at)
            if (i == G.staffRoomID) {
                continue;
            }
            let c = G.getCenter(i);
            for (let a = -2; a <= 2; a++) {
                for (let b = -2; b <= 2; b++) {
                    let key = (c[0] + a) + ',' + (c[1] + b);
                    if ((a != 0 || b != 0) && ok(key)) {
                        out.push(key);
                    }
                }
            }
        }
        for (let i = 0; i < G.hallCells.length; i++) {
            if (ok(G.hallCells[i])) {
                out.push(G.hallCells[i]);
            }
        }
        return out;
    },

    place: function () {
        let spots = this.spots();
        let kinds = Object.keys(this.KINDS);
        let n = this.MIN + Math.floor(ROT.RNG.getUniform() * this.EXTRA);
        for (let k = 0; k < n && spots.length > 0; k++) {
            let key = spots.splice(Math.floor(ROT.RNG.getUniform() * spots.length), 1)[0];
            Game.map[key].trap = ROT.RNG.getItem(kinds);
        }
    },

    // The hero stepped on `tile`: what the trap does, then the sprung trap to re-arm.
    spring: function (hero, tile) {
        let kind = tile.trap;
        let def = this.KINDS[kind];
        tile.trap = null;
        if (def == null) {
            return;
        }
        switch (kind) {
            case 'glitter': hero.splat('Glitter', 1, 4); break;
            case 'pie': hero.splat('CreamPie', 1, 3); break;
            case 'bucket': hero.splat('Water', 1, 3); break;
            case 'confetti': hero.splat('Confetti', 2, 5); break;
            case 'trapdoor':
                hero.splat('SpilledSoil', 1, 2);
                hero.spreading = 'MudPrints'; // climbs back up covered in mud
                hero.spreadCount = 12;
                break;
            case 'arrow': hero.splat('StrayArrow', 2, 2); break;
            case 'rust': hero.splat('Water', 1, 2); hero.splat('RustFlakes', 1, 2); break;
            case 'sleep': hero.splat('HeroDrool', 1, 1); break;
        }
        let sprung = makeMess(hero.x, hero.y, 'SprungTrap');
        sprung.name = 'Sprung ' + def.name;
        sprung.color = def.color;
        sprung.trap = kind;
        Invasion.event('trap', { kind: kind, name: def.name, x: hero.x, y: hero.y, sound: def.sound });
    },

    // How many are still waiting (tests, and the curious).
    hidden: function () {
        let n = 0;
        for (let key in Game.map) {
            if (Game.map[key].trap != null) {
                n++;
            }
        }
        return n;
    },
};

if (typeof module !== 'undefined') module.exports = Traps;
