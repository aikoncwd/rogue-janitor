// Your pockets (I): rings, shop purchases, cosmetic tools you can "equip" (they
// only change names in messages) and decorations/keepsakes to put up in the lounge.
// A second tab lists the achievements.
var Inventory = {
    isOpen: false,
    lastMessage: '',
    selected: -1, // index into items(); -1 until you press a letter
    tab: 'pockets', // or 'achievements'
    WIDTH: 64,
    KIND_LABEL: {tool: 'Tools (cosmetic)', decor: 'Decorations', keepsake: 'Keepsakes', ring: 'Rings', object: 'Odds and ends'},
    ORDER: ['tool', 'decor', 'keepsake', 'ring', 'object'],

    openInv: function () {
        this.isOpen = true;
        this.lastMessage = '';
        this.selected = -1;
        this.tab = 'pockets';
        Ui.resetScroll('pockets');
        Ui.resetScroll('achievements');
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

    // What [Enter] does to an item, or null when it just sits in your pocket.
    action: function (item) {
        if (item.kind == 'tool') {
            return Game.equipped[item.tool] == item.id ? 'put it away' : 'equip';
        }
        if (item.kind == 'decor' || item.kind == 'keepsake') {
            return item.placed ? 'take it down' : 'put it up in the lounge';
        }
        return null;
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
            Decor.refresh(); // up (or down) right away
            if (!item.placed) {
                return 'You take it down and keep it in your pocket for now.';
            }
            return item.noRoomDay == Game.day ? 'The lounge is full today. It goes up as soon as there is room.' : 'You put it up in the staff lounge. Lovely.';
        }
        return item.lore || item.desc || 'It does nothing. You knew that.';
    },

    handleKey: function (e) {
        let code = e.keyCode;
        if (code == 27 || code == 88 || code == 8 || code == 73) {
            this.close();
            return true;
        }
        if (code == 9 || code == 37 || code == 39) { // Tab or left/right: the other tab
            this.tab = this.tab == 'pockets' ? 'achievements' : 'pockets';
            if (e.preventDefault) {
                e.preventDefault(); // Tab must not move the browser's focus
            }
            Game.drawMap();
            return true;
        }
        let up = code == 38 || code == 104, down = code == 40 || code == 98;
        if (this.tab == 'achievements') {
            if (up || down) {
                Ui.scrollBy('achievements', up ? -1 : 1);
            }
            else if (code == 33 || code == 34) { // Page Up / Page Down
                Ui.scrollBy('achievements', code == 33 ? -10 : 10);
            }
            Game.drawMap();
            return true;
        }
        let list = this.items();
        if (up || down) {
            if (list.length > 0) {
                this.selected = this.selected < 0 ? 0 : Math.max(0, Math.min(list.length - 1, this.selected + (up ? -1 : 1)));
                this.lastMessage = '';
                Game.drawMap();
            }
            return true;
        }
        if (code == 13 || code == 32) { // Enter or Space: use the chosen item
            let item = list[this.selected];
            if (item) {
                this.lastMessage = this.action(item) ? this.use(item) : '';
                Game.drawMap();
            }
            return true;
        }
        let letter = e.key && e.key.length == 1 ? e.key : String.fromCharCode(code).toLowerCase();
        let i = this.letters().indexOf(letter);
        if (i >= 0 && i < list.length) {
            this.selected = i;
            this.lastMessage = '';
            Game.drawMap();
        }
        return true;
    },

    // The pockets list: group titles and one line per item (no descriptions:
    // those show below, for the item you pick). Also says which line is selected.
    listing: function () {
        let out = [];
        let focus = null;
        let list = this.items();
        let letters = this.letters();
        let width = this.WIDTH - 4;
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
                tag = '%c{#0f0}[equipped]%c{}';
            }
            if (item.placed) {
                tag = item.noRoomDay == Game.day ? '%c{#777}[no room today]%c{}' : '%c{#0f0}[in the lounge]%c{}';
            }
            let tagLen = Ui.plainLength(tag);
            let name = Panel.fit(item.name, width - 6 - (tagLen ? tagLen + 1 : 0));
            let pad = tag ? ' '.repeat(Math.max(1, width - 5 - name.length - tagLen)) : '';
            let on = i == this.selected;
            if (on) {
                focus = out.length;
            }
            out.push((on ? '%c{#ff0}› ' : '  ') + letters[i] + ')%c{} ' + (on ? '%c{#fff}' : '') + name + (on ? '%c{}' : '') + pad + tag);
        }
        if (list.length == 0) {
            out.push('%c{#777}Nothing but lint. Rings, shop finds and keepsakes end up here.%c{}');
        }
        return {lines: out, focus: focus};
    },

    lines: function () {
        return this.listing().lines;
    },

    // Below the list: the chosen item's description and what you can do with it.
    details: function () {
        let width = this.WIDTH - 4;
        let item = this.items()[this.selected];
        if (item == null) {
            return Ui.fixedLines('Press an item\'s letter to look at it.', width, 2, Ui.DIM).concat(['', '']);
        }
        let info = item.kind == 'ring' ? item.lore : item.desc;
        let out = Ui.fixedLines(info || 'It does nothing. You knew that.', width, 2, '#bbb');
        if (this.lastMessage) {
            return out.concat(Ui.fixedLines(this.lastMessage, width, 2, '#ff0'));
        }
        let act = this.action(item);
        return out.concat([act ? Ui.key('[Enter]') + '%c{#bbb} ' + act + '%c{}' : '', '']);
    },

    tabBar: function () {
        let ach = Achievements.count();
        let pockets = 'Pockets (' + Game.inventory.length + ')';
        let trophies = 'Achievements ' + ach.got + '/' + ach.total;
        let on = function (t) { return '%c{#000}%b{#fb3} ' + t + ' %b{' + Ui.BG + '}%c{}'; };
        let off = function (t) { return '%c{#999} ' + t + ' %c{}'; };
        return this.tab == 'pockets' ? on(pockets) + '  ' + off(trophies) : off(pockets) + '  ' + on(trophies);
    },

    draw: function () {
        let width = this.WIDTH - 4;
        if (this.tab == 'achievements') {
            Ui.window({
                id: 'achievements', title: 'Your Pockets', width: this.WIDTH,
                top: [this.tabBar(), ''], body: Achievements.entries(width),
                footer: Ui.key('[↑↓]') + ' scroll   ' + Ui.key('[Tab]') + ' pockets   ' + Ui.key('[Esc]') + ' close',
            });
            return;
        }
        let l = this.listing();
        Ui.window({
            id: 'pockets', title: 'Your Pockets', width: this.WIDTH,
            top: [this.tabBar(), '', 'Wallet: %c{#ff0}' + Game.zorkmids + ' zm%c{}', ''],
            body: l.lines, focus: l.focus,
            bottom: ['%c{#444}' + '─'.repeat(width) + '%c{}'].concat(this.details()),
            footer: Ui.key('[letter]') + ' look  ' + Ui.key('[Enter]') + ' use  ' + Ui.key('[Tab]') + ' achievements  ' + Ui.key('[Esc]') + ' close',
        });
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
        Decor.refresh();
        Game.sendMessage('%c{#f8c}' + comrade.name + ' gives you a keepsake: ' + item.name + '!%c{} It goes up in the lounge.');
        Achievements.unlock('keepsake');
        return item;
    },
};

// The things you chose to put up stand in the staff lounge: set out each morning,
// and changed at once when you put something up or take it down from your pockets.
var Decor = {
    MAX: 12,

    make: function (item, x, y) {
        let keepsake = item.kind == 'keepsake';
        return {
            x: x, y: y,
            char: keepsake ? '♥' : '§',
            color: keepsake ? '#f8c' : '#c9f',
            name: item.name,
            desc: item.desc,
            itemId: item.id,
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

    wanted: function () {
        return Game.inventory.filter(function (i) { return i.placed && (i.kind == 'decor' || i.kind == 'keepsake'); });
    },

    // Morning: the lounge is new, so everything wanted goes up from scratch.
    place: function () {
        return this.putUp(this.wanted(), 0);
    },

    // Puts items on free lounge spots (always in the day's order) until MAX are up.
    putUp: function (items, alreadyUp) {
        let spots = Game.dayRng(6).shuffle(Shop.loungeSpots());
        let n = 0;
        for (let i = 0; i < items.length; i++) {
            if (alreadyUp + n >= this.MAX || n >= spots.length) {
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

    // During the day: takes down what is no longer wanted and puts up what is
    // new, leaving everything else where it stands.
    refresh: function () {
        if (Game.map == null || Game.rooms == null || Game.rooms[Game.staffRoomID] == null) {
            return 0;
        }
        let up = {};
        for (let key in Game.map) {
            let e = Game.map[key].entity;
            if (e && e.tags && e.tags.decor) {
                let item = Game.inventory.find(function (i) { return i.id == e.itemId; });
                if (item == null || !item.placed) {
                    Game.map[key].entity = null;
                }
                else {
                    up[e.itemId] = true;
                }
            }
        }
        let missing = this.wanted().filter(function (i) { return !up[i.id]; });
        return this.putUp(missing, Object.keys(up).length);
    },
};
