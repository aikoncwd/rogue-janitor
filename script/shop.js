// Mimsy's shop in the staff lounge: a mimic pretending to be a shop counter,
// selling useless things for zorkmids. Not a comrade (no quests, no turns, no
// world RNG): just something on a lounge tile you can bump into.
var Shop = {
    STOCK_SIZE: 4,
    keeper: null,
    stock: [],
    isOpen: false,
    lastMessage: '',

    makeKeeper: function (x, y) {
        return {
            x: x, y: y,
            char: '$', color: '#fd0',
            name: 'Mimsy the Mimic (Shopkeeper)',
            tags: {shop: true},
            getArt: function () {
                let t = Game.map[this.x + ',' + this.y];
                return [this.char, this.color, t ? t.bgColor : '#000'];
            },
            describe: function () {
                return 'Mimsy the Mimic, pretending to be a shop counter. Very convincing.';
            },
            cleanerAct: function () {
                Shop.openShop();
            },
        };
    },

    // Free floor tiles in the lounge next to a wall, away from the exit door.
    loungeSpots: function () {
        let r = Game.rooms[Game.staffRoomID];
        let exit = null;
        for (let key in Game.map) {
            let e = Game.map[key].entity;
            if (e && e.tags && 'exit' in e.tags) {
                exit = [e.x, e.y];
            }
        }
        let spots = [];
        if (!r) {
            return spots;
        }
        for (let x = r[0]; x < r[2]; x++) {
            for (let y = r[1]; y < r[3]; y++) {
                let tile = Game.map[x + ',' + y];
                if (!tile || !tile.passThrough() || tile.mess != null || tile.important) {
                    continue;
                }
                if (exit && Math.max(Math.abs(exit[0] - x), Math.abs(exit[1] - y)) <= 1) {
                    continue; // keep the way out clear
                }
                let walls = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        let n = Game.map[(x + i) + ',' + (y + j)];
                        if (n && !n.passable) {
                            walls++;
                        }
                    }
                }
                if (walls >= 3) {
                    spots.push([x, y]);
                }
            }
        }
        return spots;
    },

    // Each morning: Mimsy takes a spot in the lounge and sets out today's stock.
    place: function () {
        this.isOpen = false;
        this.stock = Game.dayRng(3).shuffle(Lore.shopItems.slice()).slice(0, this.STOCK_SIZE).map(function (i) { return Object.assign({}, i); });
        let spots = this.loungeSpots();
        if (spots.length == 0) {
            this.keeper = null;
            return;
        }
        let s = Game.dayRng(4).getItem(spots);
        this.keeper = this.makeKeeper(s[0], s[1]);
        Game.map[s[0] + ',' + s[1]].entity = this.keeper;
    },

    openShop: function () {
        this.isOpen = true;
        this.lastMessage = Flavor.rng.getItem(Lore.shopkeeperLines);
        Game.drawMap();
    },

    close: function () {
        this.isOpen = false;
        Game.drawMap();
    },

    buy: function (index) {
        let item = this.stock[index];
        if (item == null) {
            return '';
        }
        if (item.sold) {
            return '"Sold out! I only had the one. Of course I did."';
        }
        if (Game.zorkmids < item.price) {
            return '"You\'re ' + (item.price - Game.zorkmids) + ' zorkmids short, friend. Mop a little more!"';
        }
        Game.zorkmids -= item.price;
        Game.run.spent = (Game.run.spent || 0) + item.price;
        Achievements.unlock('firstBuy');
        if (Game.run.spent >= 100) {
            Achievements.unlock('spend100');
        }
        if (item.kind == 'food') {
            return item.eat;
        }
        item.sold = true;
        Game.inventory.push({kind: item.kind, id: item.id, name: item.name, desc: item.desc, tool: item.tool || null});
        if (Game.run.silliestPrice == null || item.price > Game.run.silliestPrice) {
            Game.run.silliestPrice = item.price;
            Game.run.silliest = item.name;
        }
        return 'You buy the ' + item.name + '. "Pleasure doing business! It does nothing, remember."';
    },

    handleKey: function (e) {
        let code = e.keyCode;
        if (code == 27 || code == 88 || code == 8) {
            this.close();
            return true;
        }
        let i = code - 65;
        if (i >= 0 && i < this.stock.length) {
            this.lastMessage = this.buy(i);
            Game.drawMap();
        }
        return true;
    },

    lines: function () {
        let out = ['%c{#fd0}--- Mimsy\'s Perfectly Useless Shop ---%c{}', '', this.lastMessage, '',
            'Your wallet: %c{#ff0}' + Game.zorkmids + ' zm%c{}', ''];
        for (let i = 0; i < this.stock.length; i++) {
            let item = this.stock[i];
            let letter = String.fromCharCode(97 + i);
            let price = item.sold ? '%c{#777}sold%c{}' : (Game.zorkmids >= item.price ? '%c{#ff0}' : '%c{#f88}') + item.price + ' zm%c{}';
            out.push(letter + ') ' + item.name + '  ' + price);
            out.push('%c{#777}   ' + item.desc + '%c{}');
        }
        out.push('');
        out.push('%c{#777}[a-' + String.fromCharCode(96 + this.stock.length) + '] buy   [Esc] leave the shop%c{}');
        return out;
    },

    draw: function () {
        Title.drawLines(this.lines(), true);
    },
};

if (typeof module !== 'undefined') module.exports = Shop;
