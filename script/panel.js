// Screen layout "B": map viewport on the left, side panel on the right, message
// log under the map.
var Panel = {
    WIDTH: 24,
    LOG_ROWS: 5,
    MESS_BAR_MAX: 400,
    HERO_HP_MAX: 6,
    MIN_COLS_FOR_PANEL: 60,
    BAR_WIDTH: 12,

    layout: function (cols, rows) {
        let panelX = cols < this.MIN_COLS_FOR_PANEL ? cols : cols - this.WIDTH;
        let mapCols = Math.max(1, panelX);
        let logY = Math.max(1, rows - this.LOG_ROWS);
        let mapRows = Math.max(1, logY - 1);
        return {
            mapCols: mapCols,
            mapRows: mapRows,
            panelX: panelX,
            logY: logY,
            offset: [Math.max(1, Math.floor(mapCols / 2)), Math.max(1, Math.floor(mapRows / 2))],
        };
    },

    messCategories: function () {
        let c = { blood: 0, prints: 0, spills: 0, litter: 0, broken: 0, graffiti: 0, dust: 0, other: 0 };
        for (let key in Game.map) {
            let mess = Game.map[key].mess;
            if (mess == null) {
                continue;
            }
            let name = mess.kind;
            if (mess.cleanMethod == 'fix') {
                c.broken++;
            }
            else if (/Footprints$/.test(name)) {
                c.prints++;
            }
            else if (/Blood/.test(name)) {
                c.blood++;
            }
            else if (/^(Water|Acid Pool|Scorch Mark|Splinters|Spilled Ale|Slime Puddle|Slime Trail|Spilled Soil|Gravel|Dripped Wax|Spores|Mimic Drool|Bone Dust|Ectoplasm|Holy Water|Soot|Bubbling Potion)$/.test(name)) {
                c.spills++;
            }
            else if (name == 'Graffiti') {
                c.graffiti++;
            }
            else if (name == 'Cobweb') {
                c.dust++;
            }
            else if (mess.cleanMethod == 'get' && !mess.unique) {
                c.litter++;
            }
            else {
                c.other++;
            }
        }
        return c;
    },

    bar: function (value, max, color) {
        let filled = max > 0 ? Math.round(this.BAR_WIDTH * Math.max(0, Math.min(value, max)) / max) : 0;
        return '%c{' + color + '}' + '█'.repeat(filled) + '%c{#333}' + '█'.repeat(this.BAR_WIDTH - filled) + '%c{}';
    },

    fit: function (text, width) {
        return text.length > width ? text.slice(0, width - 1) + '…' : text;
    },

    // Like fit(), but for text with rot.js %c{...} colour codes: only visible
    // characters count, and the colour codes are kept.
    fitColored: function (text, width) {
        let plain = text.replace(/%c\{[^}]*\}/g, '');
        if (plain.length <= width) {
            return text;
        }
        let out = '';
        let visible = 0;
        let i = 0;
        while (i < text.length && visible < width - 1) {
            let code = text.slice(i).match(/^%c\{[^}]*\}/);
            if (code) {
                out += code[0];
                i += code[0].length;
                continue;
            }
            out += text[i];
            visible++;
            i++;
        }
        return out + '…%c{}';
    },

    // A titled list that shows as many entries as fit, then "+N more".
    listLines: function (entries, room) {
        if (entries.length <= room) {
            return entries;
        }
        let shown = Math.max(0, room - 1);
        return entries.slice(0, shown).concat(['%c{#777}+' + (entries.length - shown) + ' more%c{}']);
    },

    // Lost items a comrade has told you about and not got back yet: [{who, label, found}]
    lostItems: function () {
        return Game.monsterList.filter(function (m) {
            return m.alive && m.questItem != null && m.convoTags.questHeard && !('questItemSuccess' in m.convoTags);
        }).map(function (m) {
            return {who: m, label: m.questItemName.charAt(0).toUpperCase() + m.questItemName.slice(1), found: m.questItem.pickedUp};
        });
    },

    // Favours (with how much is left) and lost items, one line each.
    requestLines: function (w) {
        let self = this;
        let line = function (who, label, plainStatus, done) {
            let status = done ? '%c{#0c0}' + plainStatus + '%c{}' : plainStatus;
            label = self.fit(label, w - 3 - plainStatus.length);
            let pad = ' '.repeat(Math.max(1, w - 2 - label.length - plainStatus.length));
            return '%c{' + who.color + '}' + who.char + '%c{} ' + label + pad + status;
        };
        let favours = Requests.active().map(function (r) {
            return line(r.who, r.label, r.left > 0 ? String(r.left) + ' left' : 'done!', r.left <= 0);
        });
        let lost = this.lostItems().map(function (q) {
            return line(q.who, q.label, q.found ? 'found!' : 'lost', q.found);
        });
        return favours.concat(lost);
    },

    monsterStatus: function (m) {
        if (!m.alive) {
            return ['fainted', '#555'];
        }
        if (m.active) {
            return ['fighting!', '#ff0'];
        }
        return ['unharmed', '#ccc'];
    },

    lines: function (phase, maxRows = Infinity) {
        let w = this.WIDTH - 1;
        let head, list, tail;
        let hints = null, messTail = null; // cleaning: what a short panel must keep
        if (phase == 'invasion' || phase == 'intro') {
            let hero = Game.adventurer;
            let hp = hero ? Math.max(0, Math.min(hero.hp, this.HERO_HP_MAX)) : 0;
            head = [
                '%c{#fff}── INVASION ──%c{}',
                '%c{' + Invasion.heroColor() + '}' + this.fit(Invasion.hero.full, w) + '%c{}',
                'HP ' + this.bar(hp, this.HERO_HP_MAX, '#0c0') + ' ' + hp + '/' + this.HERO_HP_MAX,
                'Turn ' + Invasion.turn,
                '',
                '%c{#fff}── MONSTERS ──%c{}',
            ];
            let self = this;
            list = Invasion.roster.map(function (m) {
                let st = self.monsterStatus(m);
                let name = self.fit(m.name.split(' the ')[0], w - 2 - 10);
                let pad = ' '.repeat(Math.max(1, w - 2 - name.length - st[0].length));
                let glyphColor = m.alive ? m.color : '#555';
                return '%c{' + glyphColor + '}' + m.char + '%c{} %c{' + st[1] + '}' + name + pad + st[0] + '%c{}';
            });
            let mess = Game.messNumbers[0];
            tail = [
                '',
                '%c{#fff}── MESS ──%c{}',
                this.bar(mess, this.MESS_BAR_MAX, '#c00') + ' ' + mess,
                '',
                '%c{#777}[Space] fast: ' + (Invasion.fast ? 'on' : 'off') + '%c{}',
                '%c{#777}[Esc] skip%c{}',
                '%c{#777}[V] sound: ' + (Sfx.enabled ? 'on' : 'off') + '%c{}',
                '%c{#777}[T] music: ' + (Music.enabled ? 'on' : 'off') + '%c{}',
                '%c{#777}[+/-] zoom  [0] auto%c{}',
            ];
        }
        else {
            let pct = Game.cleanPercent();
            let near = Game.nearestMess();
            head = [
                '%c{#fff}── SHIFT ──%c{}',
                'Day ' + Game.day + ' / ' + Game.LAST_DAY + '   %c{#ff0}' + Game.zorkmids + ' zm%c{}',
                'Clean ' + this.bar(pct, 100, this.barColor(pct)) + ' ' + pct + '%',
                near ? 'Nearest mess %c{#ff0}' + near.arrow + '%c{} ' + near.d : '%c{#0c0}No mess left!%c{}',
            ];
            if (Game.comboActive() && Game.combo.count >= 2) {
                head.push('%c{#0ff}Combo x' + Game.combo.count + '%c{}');
            }
            head = head.concat(this.roomLines(Rooms.at(Game.player.x, Game.player.y), w));
            head.push('');
            if (Objectives.list.length > 0) {
                head = head.concat(['%c{#fff}── GOALS ──%c{}']).concat(Objectives.lines(w)).concat(['']);
            }
            let requests = this.requestLines(w);
            if (requests.length > 0) {
                head = head.concat(['%c{#fff}── REQUESTS ──%c{}']).concat(requests).concat(['']);
            }
            head.push('%c{#fff}── STAFF LOUNGE ──%c{}');
            let self = this;
            list = Game.monsterList.filter(function (m) { return m.alive && m.retired && !m.partying; })
                .map(function (m) { return '%c{' + m.color + '}' + m.char + '%c{} ' + self.fit(m.name, w - 2); });
            if (list.length == 0) {
                list = ['%c{#777}(nobody)%c{}'];
            }
            let c = this.messCategories();
            let labels = [['blood', '"Blood"'], ['prints', 'Footprints'], ['spills', 'Spills'],
                ['litter', 'Litter'], ['broken', 'Broken stuff'], ['graffiti', 'Graffiti'], ['dust', 'Cobwebs'],
                ['other', 'Other']];
            let messLines = [];
            for (let i = 0; i < labels.length; i++) {
                if (c[labels[i][0]] > 0) {
                    let label = labels[i][1];
                    let n = String(c[labels[i][0]]);
                    messLines.push(label + ' '.repeat(Math.max(1, w - label.length - n.length)) + n);
                }
            }
            if (messLines.length == 0) {
                messLines = ['%c{#0c0}Spotless!%c{}'];
            }
            hints = [
                '',
                '%c{#777}[?] help%c{}',
                '%c{#777}[V] sound: ' + (Sfx.enabled ? 'on' : 'off') + '%c{}',
                '%c{#777}[T] music: ' + (Music.enabled ? 'on' : 'off') + '%c{}',
                '%c{#777}[+/-] zoom  [0] auto%c{}',
            ];
            tail = ['', '%c{#fff}── MESS LEFT ──%c{}'].concat(messLines);
            messTail = tail;
            tail = tail.concat(hints);
        }
        let room = maxRows - head.length - tail.length;
        if (room < 1 && hints != null) {
            return this.shortLines(head.slice(0, -1), messTail, hints, maxRows); // minus the lounge title
        }
        if (room < 1) {
            return head.concat(tail).slice(0, Math.max(0, maxRows));
        }
        return head.concat(this.listLines(list, room)).concat(tail);
    },

    // A cleaning panel that does not fit: no lounge list. The help
    // keys always stay; then the shift basics (day, clean %, nearest mess), then
    // MESS LEFT, then whatever else of the top part fits (combo, room, goals...).
    shortLines: function (head, mess, hints, maxRows) {
        if (maxRows <= hints.length) {
            return hints.slice(hints.length - Math.max(0, maxRows));
        }
        let room = maxRows - hints.length;
        let basics = Math.min(4, head.length, room);
        if (room - basics < mess.length && mess[0] == '') {
            mess = mess.slice(1); // short on space: no blank line before MESS LEFT
        }
        if (room - basics < 2 && mess.length >= 2 && room >= 2) {
            basics = room - 2; // the MESS LEFT title with no count is no use: take a basics row
        }
        let messShown = mess.slice(0, room - basics);
        let headShown = head.slice(0, room - messShown.length);
        return headShown.concat(messShown).concat(hints);
    },

    // "Room: the Gallery of Loud Snoring" on up to two lines (rot.js drops leading
    // spaces, so the second one starts with a dim mark).
    roomLines: function (name, w) {
        let first = 'Room: ' + name;
        if (first.length <= w) {
            return [first];
        }
        let words = name.split(' ');
        let line = 'Room:';
        let k = 0;
        while (k < words.length && (line + ' ' + words[k]).length <= w) {
            line += ' ' + words[k];
            k++;
        }
        return [line, '%c{#555}·%c{} ' + this.fit(words.slice(k).join(' '), w - 2)];
    },

    barColor: function (pct) {
        return pct < 50 ? '#c33' : (pct < 80 ? '#cc3' : '#0c0');
    },

    draw: function (display, info, cols, rows) {
        if (info.panelX >= cols) {
            return; // window too narrow: panel hidden
        }
        for (let y = 0; y < rows; y++) {
            display.draw(info.panelX, y, '│', '#333', '#000');
        }
        let lines = this.lines(Game.phase, rows - 1);
        for (let i = 0; i < lines.length; i++) {
            display.drawText(info.panelX + 1, i + 1, lines[i], this.WIDTH - 1);
        }
    },
};

if (typeof module !== 'undefined') module.exports = Panel;
