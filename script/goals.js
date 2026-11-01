// Funny names for the rooms (new every morning), and the day's goals on the memo.
// Both are flavor and use Flavor.rng: they never change the dungeon itself.
var Rooms = {
    PLACES: ['Hall', 'Pantry', 'Vault', 'Gallery', 'Crypt', 'Cellar', 'Chamber', 'Den', 'Annex', 'Parlour', 'Atrium', 'Nook'],
    OF: ['Mild Peril', 'Lost Socks', 'Regret', 'Snacks', 'Echoes', 'Sticky Floors', 'Gentle Doom', 'Many Doors',
        'Odd Smells', 'Bad Puns', 'Loud Snoring', 'Lukewarm Tea'],
    ADJ: ['Slightly Haunted', 'Damp', 'Echoey', 'Suspicious', 'Forgotten', 'Very Grand', 'Drafty', 'Overdecorated', 'Moist'],

    generate: function () {
        let used = {};
        Game.roomNames = [];
        for (let i = 0; i < Game.rooms.length; i++) {
            let name;
            let tries = 0;
            do {
                if (Flavor.rng.getUniform() < 0.6) {
                    name = 'the ' + Flavor.rng.getItem(this.PLACES) + ' of ' + Flavor.rng.getItem(this.OF);
                }
                else {
                    name = 'the ' + Flavor.rng.getItem(this.ADJ) + ' ' + Flavor.rng.getItem(this.PLACES);
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
        let rooms = [];
        for (let i = 0; i < Game.rooms.length; i++) {
            if (i != Game.staffRoomID && i != Game.partyRoomID && i != Game.animalRoomID) {
                rooms.push(i);
            }
        }
        let dirty = rooms.filter(function (i) { return Objectives.messesIn(i).length >= 3; });
        if (dirty.length > 0) {
            let r = Flavor.rng.getItem(dirty);
            out.push({type: 'spotless', room: r, label: 'Leave ' + Rooms.name(r) + ' spotless'});
        }
        let broken = rooms.filter(function (i) { return Objectives.messesIn(i, 'fix').length >= 2; });
        if (broken.length > 0) {
            let r = Flavor.rng.getItem(broken);
            out.push({type: 'fixRoom', room: r, label: 'Fix everything in ' + Rooms.name(r)});
        }
        if (this.coins() >= 3) {
            out.push({type: 'coins', label: 'Pick up every coin'});
        }
        out.push({type: 'combo', label: 'Reach a ' + this.COMBO_GOAL + ' combo'});
        out.push({type: 'chat', label: 'Chat with ' + this.CHAT_GOAL + ' colleagues'});
        return out;
    },

    generate: function () {
        let options = Flavor.rng.shuffle(this.candidates());
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
            Game.sendMessage('%c{#0f0}Goal done:%c{} ' + g.label + '! (+' + this.REWARD_POINTS + ' pts, +' + this.REWARD_ZM + ' zm)');
        }
    },

    memo: function () {
        return "Today's goals: " + this.list.map(function (g) { return g.label; }).join('; ') + '.';
    },

    lines: function (width) {
        return this.list.map(function (g) {
            let mark = g.done ? '%c{#0f0}[x]%c{} ' : '[ ] ';
            return mark + Panel.fit(g.label, width - 4);
        });
    },
};

if (typeof module !== 'undefined') module.exports = { Rooms: Rooms, Objectives: Objectives };
