// Framed windows for the screens you open during a shift (shop, pockets, help):
// a box with a title in the top border, a fixed header, a scrolling body, a fixed
// bottom part and a line of key hints. Drawn over the map, centred on the screen.
var Ui = {
    BG: '#14121a',
    DIM: '#888', // at least 4.5:1 on the window background
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

    // Like wrap, for text with %c{...} colour codes: widths count visible
    // characters only, and a colour that spans a line break is closed at the end
    // of the line and opened again at the start of the next.
    wrapColored: function (text, width) {
        let self = this;
        let out = [];
        let line = '';
        let lineLen = 0;
        let color = null; // the colour open at the current point of the text
        let lineColor = null; // the colour open where the current line started
        let flush = function () {
            let opened = lineColor ? '%c{' + lineColor + '}' : '';
            out.push(opened + line + (color ? '%c{}' : ''));
            line = '';
            lineLen = 0;
            lineColor = color;
        };
        // tracks the colour codes inside a piece of text
        let follow = function (piece) {
            let re = /%c\{([^}]*)\}/g;
            let m;
            while ((m = re.exec(piece)) != null) {
                color = m[1] ? m[1] : null;
            }
        };
        String(text || '').split(' ').forEach(function (word) {
            let len = self.plainLength(word);
            if (len > width) { // a word longer than the line: cut it (it has no colour codes in practice)
                let bare = word.replace(/%[cb]\{[^}]*\}/g, '');
                if (lineLen > 0) {
                    flush();
                }
                while (bare.length > width) {
                    line = bare.slice(0, width);
                    bare = bare.slice(width);
                    flush();
                }
                line = bare;
                lineLen = bare.length;
                follow(word);
                return;
            }
            if (lineLen > 0 && lineLen + 1 + len > width) {
                flush();
            }
            if (lineLen > 0 || line != '') {
                line += ' ';
                lineLen += 1;
            }
            line += word;
            lineLen += len;
            follow(word);
        });
        if (line != '' || out.length == 0) {
            let opened = lineColor ? '%c{' + lineColor + '}' : '';
            out.push(opened + line);
        }
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

    // The footer line that fits `inner` columns. `footer` is a string or a list of
    // forms, longest first (the last one is used when none fits, and gets clipped).
    footerFor: function (footer, inner) {
        let forms = Array.isArray(footer) ? footer : [footer];
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].replace(/%[cb]\{[^}]*\}/g, '').length <= inner) {
                return forms[i];
            }
        }
        return forms[forms.length - 1];
    },

    // Whether the footer still fits on this screen: it is the first thing to go.
    hasFooter: function (o) {
        if (!o.footer) {
            return false;
        }
        let rows = Game.screenSize[1];
        return 2 + (o.top || []).length + (o.bottom || []).length + 2 + 3 <= rows;
    },

    // How many body rows a window gets on this screen (never taller than the screen).
    bodyRows: function (o) {
        let rows = Game.screenSize[1];
        let fixed = 2 + (o.top || []).length + (o.bottom || []).length + (this.hasFooter(o) ? 2 : 0);
        let roomy = Math.max(3, rows - 2 - fixed); // a margin above and below when there is space
        return Math.max(1, Math.min(roomy, rows - fixed));
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
        let footer = this.hasFooter(o) ? this.footerFor(o.footer, inner) : null;
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
        // on a tiny screen even the fixed lines may not fit: the frame never leaves the
        // screen, and lines that fall outside it are not drawn
        let h = Math.min(rows, 2 + top.length + shown + bottom.length + (footer ? 2 : 0));
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
            if (line && y < y0 + h - 1) {
                // rot.js drops leading spaces, so indent by moving the start instead.
                // Lines are clipped, never wrapped: a wrapped line would spill over the frame.
                let indent = line.match(/^ */)[0].length;
                d.drawText(x0 + 2 + indent, y, '%b{' + bg + '}' + Panel.fitColored(line.slice(indent), inner - indent));
            }
            y++;
        };
        top.forEach(put);
        let bodyY = y;
        body.slice(off, off + shown).forEach(put);
        let lastRow = y0 + h - 2; // the last row inside the frame
        if (off > 0 && bodyY <= lastRow) {
            d.draw(x0 + w - 1, bodyY, '▲', '#ff0', bg);
        }
        if (off + shown < body.length && bodyY + shown - 1 <= lastRow) {
            d.draw(x0 + w - 1, bodyY + shown - 1, '▼', '#ff0', bg);
        }
        bottom.forEach(put);
        if (footer && y < y0 + h - 2) {
            for (let x = 1; x < w - 1; x++) {
                d.draw(x0 + x, y, '─', '#444', bg);
            }
            d.draw(x0, y, '╟', color, bg);
            d.draw(x0 + w - 1, y, '╢', color, bg);
            y++;
            put('%c{' + self.DIM + '}' + footer + '%c{}');
        }
        return {x: x0, y: y0, w: w, h: h, offset: off, shown: shown};
    },

    // "[Esc]" style key labels in the hint line.
    key: function (k) {
        return '%c{#ff0}' + k + '%c{' + this.DIM + '}';
    },
};

if (typeof module !== 'undefined') module.exports = Ui;
