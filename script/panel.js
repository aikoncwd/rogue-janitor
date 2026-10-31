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
            let name = mess.name;
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

    // A scaled-down map of what you have seen: '@' you, red/orange blocks for
    // mess you have spotted, dots for explored floor. Returns colour-coded lines.
    MINIMAP_ROWS: 9,
    minimap: function (width, rows) {
        let c = Game.corners;
        let W = c[1][0] - c[0][0] + 1, H = c[1][1] - c[0][1] + 1;
        if (W < 1 || H < 1) {
            return [];
        }
        let s = Math.max(1, Math.ceil(W / width), Math.ceil(H / rows));
        let cols = Math.min(width, Math.ceil(W / s)), lines = Math.min(rows, Math.ceil(H / s));
        let out = [];
        for (let r = 0; r < lines; r++) {
            let line = '';
            for (let q = 0; q < cols; q++) {
                let seen = false, mess = 0, me = false, exit = false;
                for (let x = c[0][0] + q * s; x < c[0][0] + (q + 1) * s; x++) {
                    for (let y = c[0][1] + r * s; y < c[0][1] + (r + 1) * s; y++) {
                        if (x == Game.player.x && y == Game.player.y) {
                            me = true;
                        }
                        let t = Game.map[x + ',' + y];
                        if (!t || t.lastSeen == ' ') {
                            continue;
                        }
                        if (t.passable) {
                            seen = true;
                        }
                        if (t.mess != null) {
                            mess++;
                        }
                        if (t.entity != null && t.entity.tags && 'exit' in t.entity.tags) {
                            exit = true;
                        }
                    }
                }
                if (me) {
                    line += '%c{#ff0}@';
                }
                else if (exit) {
                    line += '%c{#c33}X';
                }
                else if (mess > 0) {
                    line += (mess >= 3 ? '%c{#e33}' : '%c{#c80}') + '\u25AA';
                }
                else if (seen) {
                    line += '%c{#555}\u00B7';
                }
                else {
                    line += ' ';
                }
            }
            out.push(line + '%c{}');
        }
        return out;
    },

    requestLines: function (w) {
        let self = this;
        return Requests.active().map(function (r) {
            let status = r.left > 0 ? String(r.left) + ' left' : '%c{#0c0}done!%c{}';
            let plainStatus = r.left > 0 ? String(r.left) + ' left' : 'done!';
            let label = self.fit(r.label, w - 3 - plainStatus.length);
            let pad = ' '.repeat(Math.max(1, w - 2 - label.length - plainStatus.length));
            return '%c{' + r.who.color + '}' + r.who.char + '%c{} ' + label + pad + status;
        });
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
            let pct = Game.messNumbers[1] > 0 ? Game.cleanPercent() : 100;
            let near = Game.nearestMess();
            head = [
                '%c{#fff}── SHIFT ──%c{}',
                'Day ' + Game.day,
                'Clean ' + this.bar(pct, 100, '#0c0') + ' ' + pct + '%',
                near ? 'Nearest mess %c{#ff0}' + near.arrow + '%c{} ' + near.d : '%c{#0c0}No mess left!%c{}',
                '',
            ];
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
            let hints = [
                '',
                '%c{#777}[?] help%c{}',
                '%c{#777}[V] sound: ' + (Sfx.enabled ? 'on' : 'off') + '%c{}',
                '%c{#777}[T] music: ' + (Music.enabled ? 'on' : 'off') + '%c{}',
                '%c{#777}[+/-] zoom  [0] auto%c{}',
            ];
            tail = ['', '%c{#fff}── MESS LEFT ──%c{}'].concat(messLines);
            // the minimap only takes the room left after the lounge list (up to 8 names)
            let spare = maxRows - head.length - tail.length - hints.length - 2 - Math.min(list.length, 8);
            let map = spare >= 4 ? this.minimap(w, Math.min(this.MINIMAP_ROWS, spare)) : [];
            if (map.length > 0) {
                tail = tail.concat(['', '%c{#fff}── MAP ──%c{}']).concat(map);
            }
            tail = tail.concat(hints);
        }
        let room = maxRows - head.length - tail.length;
        if (room < 1) {
            return head.concat(tail).slice(0, Math.max(0, maxRows));
        }
        return head.concat(this.listLines(list, room)).concat(tail);
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
