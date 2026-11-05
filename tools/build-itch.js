// Builds dist/rogue-janitor-itch.zip: the game as itch.io wants it (index.html at the
// root, everything it loads next to it, nothing from a CDN). No dependencies:
//   node tools/build-itch.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'rogue-janitor-itch.zip');

// Every file the page loads, plus the licence.
function files() {
    const list = ['index.html', 'LICENSE', 'vendor/rot.js'];
    for (const dir of ['script', 'style']) {
        for (const f of fs.readdirSync(path.join(ROOT, dir)).sort()) {
            list.push(dir + '/' + f);
        }
    }
    // anything index.html references must be in the zip
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (/^https?:/.test(m[1])) {
            throw new Error('index.html still loads ' + m[1] + ' from the internet');
        }
        if (!list.includes(m[1])) {
            throw new Error('index.html loads ' + m[1] + ', which is not packed');
        }
    }
    return list;
}

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

// A plain zip (deflate, no zip64): small games only.
function zip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    const time = 0, date = (2026 - 1980) << 9 | 1 << 5 | 1; // a fixed stamp: same input, same zip
    for (const { name, data } of entries) {
        const packed = zlib.deflateRawSync(data, { level: 9 });
        const crc = crc32(data);
        const nameBuf = Buffer.from(name, 'utf8');
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6); // utf-8 names
        local.writeUInt16LE(8, 8);
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(date, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(packed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);
        locals.push(local, nameBuf, packed);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(time, 12);
        central.writeUInt16LE(date, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(packed.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt32LE(offset, 42);
        centrals.push(central, nameBuf);
        offset += local.length + nameBuf.length + packed.length;
    }
    const cd = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, end]);
}

if (require.main === module) {
    const list = files();
    const out = zip(list.map(name => ({ name, data: fs.readFileSync(path.join(ROOT, name)) })));
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, out);
    console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + list.length + ' files, ' + Math.round(out.length / 1024) + ' KB)');
}

module.exports = { files, zip, crc32 };
