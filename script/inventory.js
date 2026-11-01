// Your pockets (I): rings, shop purchases, cosmetic tools you can "equip" (they
// only change names in messages) and decorations/keepsakes to put up in the lounge.
var Inventory = {
    isOpen: false,
    lastMessage: '',
    KIND_LABEL: {tool: 'Tools (cosmetic)', decor: 'Decorations', keepsake: 'Keepsakes', ring: 'Rings', object: 'Odds and ends'},
    ORDER: ['tool', 'decor', 'keepsake', 'ring', 'object'],

    openInv: function () {
        this.isOpen = true;
        this.lastMessage = '';
        Game.drawMap();
    },

    close: function () {
        this.isOpen = false;
        Game.drawMap();
    },

    // Items in display order (letters a, b, c... follow this order).
    items: function () {
        let order = this.ORDER;
        return Game.inventory.slice().sort(function (a, b) {
            return order.indexOf(a.kind) - order.indexOf(b.kind);
        });
    },

    // Letters for the items in order, skipping i/I and x/X (they close the screen).
    letters: function () {
        let out = [];
        for (let c = 97; c <= 122; c++) {
            if (c != 105 && c != 120) {
                out.push(String.fromCharCode(c));
            }
        }
        for (let c = 65; c <= 90; c++) { // then capitals, for a very full pocket
            if (c != 73 && c != 88) {
                out.push(String.fromCharCode(c));
            }
        }
        return out;
    },

    // The cosmetic name of an equipped tool, or null.
    toolName: function (tool) {
        let id = Game.equipped && Game.equipped[tool];
        if (!id) {
            return null;
        }
        let item = Game.inventory.find(function (i) { return i.id == id; });
        return item ? item.name : null;
    },

    use: function (item) {
        if (item.kind == 'tool') {
            if (Game.equipped[item.tool] == item.id) {
                delete Game.equipped[item.tool];
                return 'You put the ' + item.name + ' away. Your old ' + item.tool + ' is happy to be back.';
            }
            Game.equipped[item.tool] = item.id;
            return 'You equip the ' + item.name + '. It works exactly like before, but with style.';
        }
        if (item.kind == 'decor' || item.kind == 'keepsake') {
            item.placed = !item.placed;
            return item.placed ? 'It will go up in the staff lounge tomorrow morning.' : 'You keep it in your pocket for now.';
        }
        return item.lore || item.desc || 'It does nothing. You knew that.';
    },

    handleKey: function (e) {
        let code = e.keyCode;
        if (code == 27 || code == 88 || code == 8 || code == 73) {
            this.close();
            return true;
        }
        let list = this.items();
        let letter = e.key && e.key.length == 1 ? e.key : String.fromCharCode(code).toLowerCase();
        let i = this.letters().indexOf(letter);
        if (i >= 0 && i < list.length) {
            this.lastMessage = this.use(list[i]);
            Game.drawMap();
        }
        return true;
    },

    lines: function () {
        let out = ['%c{#fb3}--- YOUR POCKETS ---%c{}', '',
            'Wallet: %c{#ff0}' + Game.zorkmids + ' zm%c{}', ''];
        let list = this.items();
        if (list.length == 0) {
            out.push('%c{#777}Nothing but lint. Rings, shop finds and keepsakes end up here.%c{}');
        }
        let lastKind = null;
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            if (item.kind != lastKind) {
                if (lastKind != null) {
                    out.push('');
                }
                out.push('%c{#fff}' + (this.KIND_LABEL[item.kind] || item.kind) + '%c{}');
                lastKind = item.kind;
            }
            let tag = '';
            if (item.kind == 'tool' && Game.equipped[item.tool] == item.id) {
                tag = ' %c{#0f0}[equipped]%c{}';
            }
            if (item.placed) {
                tag = item.noRoomDay == Game.day ? ' %c{#777}[no room today]%c{}' : ' %c{#0f0}[in the lounge]%c{}';
            }
            out.push(this.letters()[i] + ') ' + item.name + tag);
            let info = item.kind == 'ring' ? item.lore : item.desc;
            if (info) {
                out.push('%c{#777}   ' + info + '%c{}');
            }
        }
        out.push('');
        if (this.lastMessage) {
            out.push('%c{#ff0}' + this.lastMessage + '%c{}');
            out.push('');
        }
        let ach = Achievements.count();
        out.push('%c{#777}Achievements: ' + ach.got + ' / ' + ach.total + '   [letter] use / equip / put up   [Esc] close%c{}');
        return out;
    },

    draw: function () {
        Title.drawLines(this.lines(), true);
    },
};

if (typeof module !== 'undefined') module.exports = Inventory;

// Little gifts from comrades whose requests you finished (from day 2).
var Keepsakes = {
    give: function (comrade) {
        if (Game.day < 2 || comrade == null || comrade.keepsakeDay == Game.day || (comrade.tags && comrade.tags.visitor)) {
            return null;
        }
        comrade.keepsakeDay = Game.day;
        let first = comrade.name.split(' ')[0];
        let gift = Flavor.rng.getItem(Lore.keepsakes);
        let item = {kind: 'keepsake', id: 'keep-' + Game.day + '-' + first, name: first + "'s " + gift,
            desc: 'A thank-you from ' + comrade.name + '. Purely sentimental: it does nothing, and that is fine.', placed: true};
        Game.inventory.push(item);
        Game.sendMessage('%c{#f8c}' + comrade.name + ' gives you a keepsake: ' + item.name + '!%c{} It will go up in the lounge.');
        Achievements.unlock('keepsake');
        return item;
    },
};

// Each morning the things you chose to put up appear in the staff lounge.
var Decor = {
    MAX: 6,

    make: function (item, x, y) {
        let keepsake = item.kind == 'keepsake';
        return {
            x: x, y: y,
            char: keepsake ? '♥' : '§',
            color: keepsake ? '#f8c' : '#c9f',
            name: item.name,
            desc: item.desc,
            tags: {decor: true},
            getArt: function () {
                let t = Game.map[this.x + ',' + this.y];
                return [this.char, this.color, t ? t.bgColor : '#000'];
            },
            describe: function () {
                return this.name + '. ' + this.desc;
            },
            cleanerAct: function () {
                Game.sendMessage('You admire the ' + this.name + '. ' + this.desc);
                Game.drawMap();
            },
        };
    },

    place: function () {
        let items = Game.inventory.filter(function (i) { return i.placed && (i.kind == 'decor' || i.kind == 'keepsake'); });
        if (items.length == 0) {
            return 0;
        }
        let spots = Game.dayRng(6).shuffle(Shop.loungeSpots());
        let n = 0;
        for (let i = 0; i < items.length; i++) {
            if (n >= this.MAX || n >= spots.length) {
                items[i].noRoomDay = Game.day; // still wanted up, but not today
                continue;
            }
            delete items[i].noRoomDay;
            let s = spots[n];
            Game.map[s[0] + ',' + s[1]].entity = this.make(items[i], s[0], s[1]);
            n++;
        }
        return n;
    },
};
