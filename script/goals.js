// Funny names for the rooms (new every morning), and the day's goals on the memo.
// They use the day's own seeded generators (Game.dayRng): the same whether the raid
// was watched or skipped, and the same after a Continue. They never touch ROT.RNG.
var Rooms = {
    PLACES: ['Hall', 'Pantry', 'Vault', 'Gallery', 'Crypt', 'Cellar', 'Chamber', 'Den', 'Annex', 'Parlour', 'Atrium', 'Nook'],
    OF: ['Mild Peril', 'Lost Socks', 'Regret', 'Snacks', 'Echoes', 'Sticky Floors', 'Gentle Doom', 'Many Doors',
        'Odd Smells', 'Bad Puns', 'Loud Snoring', 'Lukewarm Tea'],
    ADJ: ['Slightly Haunted', 'Damp', 'Echoey', 'Suspicious', 'Forgotten', 'Very Grand', 'Drafty', 'Overdecorated', 'Moist'],

    generate: function () {
        let used = {};
        let rng = Game.dayRng(1);
        Game.roomNames = [];
        for (let i = 0; i < Game.rooms.length; i++) {
            let name;
            let tries = 0;
            do {
                if (rng.getUniform() < 0.6) {
                    name = 'the ' + rng.getItem(this.PLACES) + ' of ' + rng.getItem(this.OF);
                }
                else {
                    name = 'the ' + rng.getItem(this.ADJ) + ' ' + rng.getItem(this.PLACES);
                }
            } while (used[name] && tries++ < 50);
            used[name] = true;
            Game.roomNames.push(name);
        }
    },

    name: function (i) {
        if (i == Game.staffRoomID) {
            return 'the Staff Lounge';
        }
        if (i == Game.partyRoomID) {
            return 'the Party Room';
        }
        if (i == Game.animalRoomID) {
            return 'the Petting Zoo';
        }
        if (Game.roomNames == null || Game.roomNames.length != Game.rooms.length) {
            this.generate();
        }
        return Game.roomNames[i];
    },

    at: function (x, y) {
        let i = Game.getRoomIndex(x, y);
        return i < 0 ? 'a corridor' : this.name(i);
    },
};

var Objectives = {
    REWARD_POINTS: 25,
    REWARD_ZM: 10,
    COMBO_GOAL: 15,
    CHAT_GOAL: 3,
    list: [],

    // Messes (optionally only one clean method) inside room i.
    messesIn: function (i, method) {
        let out = [];
        for (let key in Game.map) {
            let m = Game.map[key].mess;
            if (m == null || (method && m.cleanMethod != method)) {
                continue;
            }
            let p = key.split(',');
            if (Game.getRoomIndex(parseInt(p[0]), parseInt(p[1])) == i) {
                out.push(m);
            }
        }
        return out;
    },

    coins: function () {
        let n = 0;
        for (let key in Game.map) {
            let m = Game.map[key].mess;
            if (m != null && m.kind == 'Scattered Gold Coins') {
                n++;
            }
        }
        return n;
    },

    chatted: function () {
        return Game.monsterList.filter(function (m) { return m.alive && m.playerTalkedToday && !(m.tags && m.tags.visitor); }).length;
    },

    candidates: function () {
        let out = [];
        let rng = Game.dayRng(5);
        let rooms = [];
        for (let i = 0; i < Game.rooms.length; i++) {
            if (i != Game.staffRoomID && i != Game.partyRoomID && i != Game.animalRoomID) {
                rooms.push(i);
            }
        }
        let dirty = rooms.filter(function (i) { return Objectives.messesIn(i).length >= 3; });
        if (dirty.length > 0) {
            let r = rng.getItem(dirty);
            out.push({type: 'spotless', room: r, label: 'Leave ' + Rooms.name(r) + ' spotless',
                short: 'Spotless: ' + Rooms.name(r).replace(/^the /, '')});
        }
        let broken = rooms.filter(function (i) { return Objectives.messesIn(i, 'fix').length >= 2; });
        if (broken.length > 0) {
            let r = rng.getItem(broken);
            out.push({type: 'fixRoom', room: r, label: 'Fix everything in ' + Rooms.name(r),
                short: 'Fix all: ' + Rooms.name(r).replace(/^the /, '')});
        }
        if (this.coins() >= 3) {
            out.push({type: 'coins', label: 'Pick up every coin'});
        }
        out.push({type: 'combo', label: 'Reach a ' + this.COMBO_GOAL + ' combo'});
        out.push({type: 'chat', label: 'Chat with ' + this.CHAT_GOAL + ' colleagues'});
        return out;
    },

    generate: function () {
        let options = Game.dayRng(2).shuffle(this.candidates());
        let n = Game.day <= 1 ? 1 : 2;
        this.list = options.slice(0, n).map(function (g) { g.done = false; return g; });
    },

    isDone: function (g) {
        switch (g.type) {
            case 'spotless': return this.messesIn(g.room).length == 0;
            case 'fixRoom': return this.messesIn(g.room, 'fix').length == 0;
            case 'coins': return this.coins() == 0;
            case 'combo': return Game.combo.bestToday >= this.COMBO_GOAL;
            case 'chat': return this.chatted() >= this.CHAT_GOAL;
        }
        return false;
    },

    check: function () {
        for (let i = 0; i < this.list.length; i++) {
            let g = this.list[i];
            if (g.done || !this.isDone(g)) {
                continue;
            }
            g.done = true;
            Game.yendorPoints += this.REWARD_POINTS;
            Game.zorkmids += this.REWARD_ZM;
            Game.run.zorkmidsEarned += this.REWARD_ZM;
            Game.run.goalsDone = (Game.run.goalsDone || 0) + 1;
            if (this.list.length >= 2 && this.list.every(function (x) { return x.done; })) {
                Achievements.unlock('goals2');
            }
            Game.sendMessage('%c{#0f0}Goal done:%c{} ' + g.label + '! (+' + this.REWARD_POINTS + ' pts, +' + this.REWARD_ZM + ' zm)');
        }
    },

    memoLines: function () {
        return this.list.map(function (g) { return 'Goal: ' + g.label + '. (+' + Objectives.REWARD_POINTS + ' pts, +' + Objectives.REWARD_ZM + ' zm)'; });
    },

    // Panel lines: each goal on up to two lines, so a room name is not cut off.
    lines: function (width) {
        let out = [];
        let w = width - 4;
        this.list.forEach(function (g) {
            let words = (g.short || g.label).split(' ');
            let rows = [''];
            words.forEach(function (word) {
                let row = rows[rows.length - 1];
                if (row.length > 0 && (row + ' ' + word).length > w) {
                    rows.push(word);
                }
                else {
                    rows[rows.length - 1] = row.length > 0 ? row + ' ' + word : word;
                }
            });
            if (rows.length > 2) {
                rows = [rows[0], Panel.fit(rows.slice(1).join(' '), w)];
            }
            let mark = g.done ? '%c{#0f0}[x]%c{} ' : '[ ] ';
            out.push(mark + Panel.fit(rows[0], w));
            if (rows.length > 1) {
                out.push('%c{#555}·%c{}   ' + rows[1]); // rot.js drops leading spaces
            }
        });
        return out;
    },
};

if (typeof module !== 'undefined') module.exports = { Rooms: Rooms, Objectives: Objectives };
