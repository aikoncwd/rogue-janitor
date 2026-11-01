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
        let i = code - 65;
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
                tag = ' %c{#0f0}[in the lounge]%c{}';
            }
            out.push(String.fromCharCode(97 + i) + ') ' + item.name + tag);
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
