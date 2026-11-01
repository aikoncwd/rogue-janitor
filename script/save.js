// Save / continue. The run is saved at the start of each day (after the night,
// before the dungeon is built), so Continue replays that day from its first minute.
// Comrades, pets and their lost items are plain objects with prototypes and
// references to each other: a small graph encoder keeps both.
var Save = {
    VERSION: 1,
    KEY: 'rj-save',
    problem: null, // a kind line for the title screen when a save could not be used

    TYPES: function () {
        // most specific first (a Pet is also an Entity)
        return [['Pet', Pet], ['Entity', Entity], ['Mess', Mess]];
    },

    SKIP: { convoOptions: true },

    encode: function (value, seen) {
        if (value == null || typeof value != 'object') {
            return typeof value == 'function' ? undefined : value;
        }
        if (Array.isArray(value)) {
            let self = this;
            return value.map(function (v) { let e = self.encode(v, seen); return e === undefined ? null : e; });
        }
        let type = null;
        let types = this.TYPES();
        for (let i = 0; i < types.length; i++) {
            if (value instanceof types[i][1]) {
                type = types[i][0];
                break;
            }
        }
        let proto = Object.getPrototypeOf(value);
        let plain = proto === null || Object.getPrototypeOf(proto) === null; // any realm's Object.prototype
        if (type == null && !plain) {
            return undefined; // something we don't know how to rebuild: leave it out
        }
        if (type != null) {
            if (seen.ids.has(value)) {
                return { __ref: seen.ids.get(value) };
            }
            seen.ids.set(value, seen.next++);
        }
        let out = type != null ? { __t: type, __id: seen.ids.get(value) } : {};
        for (let key in value) {
            if (!Object.prototype.hasOwnProperty.call(value, key) || this.SKIP[key]) {
                continue;
            }
            let e = this.encode(value[key], seen);
            if (e !== undefined) {
                out[key] = e;
            }
        }
        return out;
    },

    decode: function (data, made) {
        if (data == null || typeof data != 'object') {
            return data;
        }
        if (Array.isArray(data)) {
            let self = this;
            return data.map(function (v) { return self.decode(v, made); });
        }
        if ('__ref' in data) {
            return made[data.__ref];
        }
        let obj;
        if ('__t' in data) {
            let ctor = this.TYPES().find(function (t) { return t[0] == data.__t; });
            obj = Object.create(ctor[1].prototype);
            made[data.__id] = obj;
        }
        else {
            obj = {};
        }
        for (let key in data) {
            if (key == '__t' || key == '__id') {
                continue;
            }
            obj[key] = this.decode(data[key], made);
        }
        if ('__t' in data) {
            obj.convoOptions = {};
        }
        return obj;
    },

    snapshot: function () {
        let G = Game;
        let seen = { ids: new Map(), next: 0 };
        return {
            version: this.VERSION,
            day: G.day,
            dungeonRooms: G.dungeonRooms,
            yendorPoints: G.yendorPoints,
            zorkmids: G.zorkmids,
            run: JSON.parse(JSON.stringify(G.run)),
            convoTags: this.encode(G.convoTags, seen),
            unionist: G.unionist,
            pastHeroes: JSON.parse(JSON.stringify(G.pastHeroes)),
            nameRegistry: G.nameRegistry.slice(),
            amuletStolen: G.amuletStolen,
            reach: G.player.reach,
            world: this.encode({ monsterList: G.monsterList, petList: G.petList, playerPet: G.playerPet }, seen),
            rng: ROT.RNG.getState(),
        };
    },

    restore: function (data) {
        let G = Game;
        let world = this.decode(data.world, {});
        G.day = data.day;
        G.dungeonRooms = data.dungeonRooms;
        G.yendorPoints = data.yendorPoints;
        G.zorkmids = data.zorkmids;
        G.run = data.run;
        G.convoTags = this.decode(data.convoTags, {});
        G.unionist = data.unionist;
        G.pastHeroes = data.pastHeroes;
        G.nameRegistry = data.nameRegistry;
        G.amuletStolen = data.amuletStolen;
        G.monsterList = world.monsterList;
        G.petList = world.petList;
        G.playerPet = world.playerPet || null;
        G.victory = false;
        G.hintsToday = [];
        G.player.reach = data.reach;
        G.player.cutscene = null; // the first-day welcome has been seen
        ROT.RNG.setState(data.rng);
    },

    write: function () {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(this.snapshot()));
            return true;
        }
        catch (e) {
            return false; // no storage: the run just can't be continued later
        }
    },

    // The saved run, or null (and a kind line in `problem`) when it can't be used.
    read: function () {
        let raw;
        try {
            raw = localStorage.getItem(this.KEY);
        }
        catch (e) {
            return null;
        }
        if (raw == null) {
            return null;
        }
        let data = null;
        try {
            data = JSON.parse(raw);
        }
        catch (e) {
            data = null;
        }
        if (data == null || data.version !== this.VERSION || !this.looksComplete(data)) {
            this.problem = Flavor.line('saveLost');
            this.clear();
            return null;
        }
        return data;
    },

    looksComplete: function (data) {
        return typeof data.day == 'number' && data.world != null && Array.isArray(data.world.monsterList) &&
            Array.isArray(data.rng) && Array.isArray(data.nameRegistry) && data.run != null;
    },

    exists: function () {
        return this.read() != null;
    },

    clear: function () {
        try {
            localStorage.removeItem(this.KEY);
        }
        catch (e) {
            // storage unavailable
        }
    },

    // Title screen: pick the run up where the last morning began.
    continueRun: function () {
        let data = this.read();
        if (data == null) {
            return false;
        }
        Title.stop();
        this.restore(data);
        Game.generateDungeon(); // a morning: the invasion replay starts
        Game.drawMap();
        return true;
    },
};

if (typeof module !== 'undefined') module.exports = Save;
