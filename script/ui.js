// Framed windows for the screens you open during a shift (shop, pockets, help):
// a box with a title in the top border, a fixed header, a scrolling body, a fixed
// bottom part and a line of key hints. Drawn over the map, centred on the screen.
var Ui = {
    BG: '#14121a',
    DIM: '#777',
    offsets: {}, // scroll position of each window's body, by id

    // Visible length of a line with rot.js %c{...}/%b{...} codes.
    plainLength: function (text) {
        return text.replace(/%[cb]\{[^}]*\}/g, '').length;
    },

    // Plain text broken into lines of at most `width` characters.
    wrap: function (text, width) {
        let out = [];
        String(text || '').split('\n').forEach(function (para) {
            let line = '';
            para.split(' ').forEach(function (word) {
                while (word.length > width) { // a word longer than the line: cut it
                    if (line) {
                        out.push(line);
                        line = '';
                    }
                    out.push(word.slice(0, width));
                    word = word.slice(width);
                }
                if (line == '') {
                    line = word;
                }
                else if (line.length + 1 + word.length <= width) {
                    line += ' ' + word;
                }
                else {
                    out.push(line);
                    line = word;
                }
            });
            out.push(line);
        });
        return out;
    },

    // Exactly `n` lines: wrapped text, padded with blanks or cut with "…", so
    // whatever the message says nothing below it moves.
    fixedLines: function (text, width, n, color) {
        let lines = this.wrap(text, width);
        if (lines.length > n) {
            lines = lines.slice(0, n);
            let last = lines[n - 1];
            lines[n - 1] = (last.length >= width ? last.slice(0, width - 1) : last) + '…';
        }
        while (lines.length < n) {
            lines.push('');
        }
        return lines.map(function (l) { return l && color ? '%c{' + color + '}' + l + '%c{}' : l; });
    },

    scrollBy: function (id, delta) {
        this.offsets[id] = Math.max(0, (this.offsets[id] || 0) + delta);
    },

    resetScroll: function (id) {
        this.offsets[id] = 0;
    },

    // How many body rows a window gets on this screen.
    bodyRows: function (o) {
        let rows = Game.screenSize[1];
        let fixed = 2 + (o.top || []).length + (o.bottom || []).length + (o.footer ? 2 : 0);
        return Math.max(3, rows - 2 - fixed);
    },

    // o: {id, title, color, width, top, body, bottom, footer, focus}
    // `focus` is a body line to keep in view (the selected item).
    // Returns the window's rectangle and which body lines are showing.
    window: function (o) {
        let d = Game.display;
        let cols = Game.screenSize[0];
        let rows = Game.screenSize[1];
        let color = o.color || '#fb3';
        let w = Math.max(20, Math.min(cols - 2, o.width || 60));
        let inner = w - 4;
        let top = o.top || [], body = o.body || [], bottom = o.bottom || [];
        let room = this.bodyRows(o);
        let shown = Math.min(body.length, room);
        let maxOff = Math.max(0, body.length - shown);
        let off = Math.min(this.offsets[o.id] || 0, maxOff);
        if (o.focus != null) {
            if (o.focus < off) {
                off = o.focus;
            }
            else if (o.focus >= off + shown) {
                off = o.focus - shown + 1;
            }
        }
        this.offsets[o.id] = off;
        let h = 2 + top.length + shown + bottom.length + (o.footer ? 2 : 0);
        let x0 = Math.max(0, Math.floor((cols - w) / 2));
        let y0 = Math.max(0, Math.floor((rows - h) / 2));
        let bg = this.BG;

        // the frame and a filled background
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let ch = ' ';
                let edgeY = y == 0 || y == h - 1;
                let edgeX = x == 0 || x == w - 1;
                if (edgeY && edgeX) {
                    ch = y == 0 ? (x == 0 ? '╔' : '╗') : (x == 0 ? '╚' : '╝');
                }
                else if (edgeY) {
                    ch = '═';
                }
                else if (edgeX) {
                    ch = '║';
                }
                d.draw(x0 + x, y0 + y, ch, color, bg);
            }
        }
        let title = ' ' + o.title + ' ';
        if (title.length > w - 4) {
            title = ' ' + o.title.slice(0, w - 7) + '… ';
        }
        d.drawText(x0 + Math.floor((w - title.length) / 2), y0, '%c{#000}%b{' + color + '}' + title);

        let self = this;
        let y = y0 + 1;
        let put = function (line) {
            if (line) {
                // rot.js drops leading spaces, so indent by moving the start instead
                let indent = line.match(/^ */)[0].length;
                d.drawText(x0 + 2 + indent, y, '%b{' + bg + '}' + line.slice(indent), inner - indent);
            }
            y++;
        };
        top.forEach(put);
        let bodyY = y;
        body.slice(off, off + shown).forEach(put);
        if (off > 0) {
            d.draw(x0 + w - 1, bodyY, '▲', '#ff0', bg);
        }
        if (off + shown < body.length) {
            d.draw(x0 + w - 1, bodyY + shown - 1, '▼', '#ff0', bg);
        }
        bottom.forEach(put);
        if (o.footer) {
            for (let x = 1; x < w - 1; x++) {
                d.draw(x0 + x, y, '─', '#444', bg);
            }
            d.draw(x0, y, '╟', color, bg);
            d.draw(x0 + w - 1, y, '╢', color, bg);
            y++;
            put('%c{' + self.DIM + '}' + o.footer + '%c{}');
        }
        return {x: x0, y: y0, w: w, h: h, offset: off, shown: shown};
    },

    // "[Esc]" style key labels in the hint line.
    key: function (k) {
        return '%c{#ff0}' + k + '%c{' + this.DIM + '}';
    },
};

if (typeof module !== 'undefined') module.exports = Ui;
