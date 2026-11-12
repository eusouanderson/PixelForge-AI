#!/usr/bin/env node

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const ROOT = resolve(process.cwd());
const RES_DIR = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const PUBLIC_FAVICON = join(ROOT, 'public', 'favicon.svg');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePngRgba(width, height, rgbaBuffer) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgbaBuffer.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function hexToRgba(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) : 255
  ];
}

const PALETTE = {
  '.': null,
  k: '#060a17', // deep obsidian outline
  m: '#a7f3d0', // emerald highlight
  l: '#34d399', // emerald light
  g: '#10b981', // emerald base
  d: '#059669', // emerald shadow
  b: '#6ee7b7', // soft mint belly/muzzle
  Y: '#fef08a', // gold crown highlight
  y: '#fbbf24', // gold crown base
  o: '#d97706', // amber orange
  W: '#ffffff', // specular white eye glint / fang
  E: '#fffbeb', // ivory egg highlight
  e: '#fef3c7', // egg light
  c: '#f5d08a', // egg midtone
  a: '#b45309', // egg deep shadow
  t: '#78350f', // darkest crack/bottom shadow
  p: '#fb7185', // coral blush cheek
  C: '#67e8f9', // cyan arcane spark
  q: '#06b6d4'  // cyan core
};

/**
 * 36x36 centered mascot for Android Adaptive Icon foreground (placed at (9,9) in 54x54).
 * Every row is strictly 36 characters, symmetrically framed with two distinct glossy eyes,
 * green snout bridge, 3-spike golden forge crown, coral cheeks, tiny emerald claws, and cracked egg!
 */
const MASCOT_36 = [
  '....................................',
  '....................................',
  '................................C...',
  '...........kk........kk........CqC..',
  '..Y.......kYYk..kk..kYYk........C...',
  '.YqY......kYyk.kYYk.kYyk............',
  '..Y.......kYok.kYyk.kYok............',
  '...........kkkkkkkkkkkk.............',
  '.........kmmmmmmmmllllggk...........',
  '........kmmmmmmmllllllllggk.........',
  '.......kmmmmmllllllllllllggk........',
  '......kmmmllllllbbbbllllllggk.......',
  '......kmmllkkkllbbbbllkkkllgk.......',
  '.....kmmllkWWkkllbbllkWWkkllgk......',
  '.....kmmllkWkkklbbbbkWkkkllggk......',
  '.....kmmllkkyykkbkbbkkyykkllgk......',
  '.....kmmlllkkkkbbbbbbkkkkllggk......',
  '.....kmmppplllbbbbbbbblllppdgk......',
  '.....kmmmllllbWkkkkkkWbllggddk......',
  '......kmmllllbWbbbbbbWbllggdk.......',
  '...k...kmmmllbbbCCbbbllggddk...k....',
  '..kEk...kmmllkkllllllkkggdk...kEk...',
  '..kEEk.kkkmmkEekllllkEekgdkkk.kEEk..',
  '.kEEEekmlkkEEEEEkllkEEEEEekdmkEEEek.',
  '.kEEEEkkEEEEEEEEkEekEEEEEEEEekEEEEk.',
  '.kEEEEEkEEEEEEEEEEEEEEEEEEEEkEEEEEk.',
  '.kEEggkEEEEeeeeeeeeeeeeEEEEkEEggck..',
  '.kEEggceEEEEEEEEEEEEEEEEEEEecEggck..',
  '..kEEcceeeeeeEEEEEEEEeeeeeeccccck...',
  '..kEcccceeeeccccccccceeeeccccccak...',
  '...kEccccccggcccccccyyyccccccccak...',
  '...kccccccaaacccccccaaacccccccak....',
  '....kcccccaaaccccccccaaacccccak.....',
  '.....kaaaaaaaaaaaaaaaaaaaaaaak......',
  '......ktttttttttttttttttttttk.......',
  '.......kkkkkkkkkkkkkkkkkkkkk........'
];

/**
 * 24x24 pixel-perfect badge mascot for legacy PNGs & web favicon.svg.
 * Symmetrical, centered inside safe bezel with jagged cracked egg & friendly smile.
 */
const MASCOT_24 = [
  '........................',
  '.......kk......kk.......',
  '......kYYk.kk.kYYk......',
  '..Y...kYok.YY.kYok..C...',
  '.YqY...kkkkkkkkkk..CqC..',
  '..Y..kmmmmllllllggk.C...',
  '....kmmmllllllllllgk....',
  '...kmmllkkllbbllkkllk...',
  '...kmmlkWkkllllkWkkdk...',
  '...kmmlkyykbbbbkyykdk...',
  '...kmmppkbbbbbbbbppdk...',
  '....kmmllbWkkkkWbggk....',
  '.....kmmlbbbCCbbggk.....',
  '..k..kkmlkkkkkkkdk..k...',
  '.kEkkmkEEEkEEEEkEEkkEk..',
  '.kEEkkEEEEEkEEkEEEEkEk..',
  '.kEggkEEEeeeeeeeeEEEeck.',
  '.kEgcceeeEEEEEEEEeeccck.',
  '..kEcccggccccccyycccca..',
  '..kccccaaacccccaaaccck..',
  '...kcccaaaaaaaaaaaack...',
  '....kaaaaaaaaaaaaaak....',
  '.....kttttttttttttk.....',
  '......kkkkkkkkkkkk......'
];

function validateGrid(name, grid, expectedSize) {
  if (grid.length !== expectedSize) {
    throw new Error(`${name} height is ${grid.length}, expected ${expectedSize}`);
  }
  grid.forEach((row, y) => {
    if (row.length !== expectedSize) {
      throw new Error(`${name} row ${y} length is ${row.length}, expected ${expectedSize}`);
    }
  });
}

validateGrid('MASCOT_36', MASCOT_36, 36);
validateGrid('MASCOT_24', MASCOT_24, 24);

function isInsideMask(px, py, size, circularMask) {
  if (!circularMask) return true;
  const dx = px + 0.5 - size / 2;
  const dy = py + 0.5 - size / 2;
  const r = size / 2 - 0.25;
  return dx * dx + dy * dy <= r * r;
}

function renderSpriteToBuffer(grid, canvasSize, offsetX, offsetY, scale, bgMode) {
  const buf = Buffer.alloc(canvasSize * canvasSize * 4, 0);
  const circular = bgMode === 'round';

  if (bgMode !== 'transparent') {
    const blockSize = canvasSize / 24;
    for (let py = 0; py < canvasSize; py++) {
      for (let px = 0; px < canvasSize; px++) {
        if (!isInsideMask(px, py, canvasSize, circular)) continue;

        const gx = Math.floor(px / blockSize);
        const gy = Math.floor(py / blockSize);

        if (!circular) {
          const cornerCut =
            (gx < 2 && gy < 2 && gx + gy < 2) ||
            (gx >= 22 && gy < 2 && (23 - gx) + gy < 2) ||
            (gx < 2 && gy >= 22 && gx + (23 - gy) < 2) ||
            (gx >= 22 && gy >= 22 && (23 - gx) + (23 - gy) < 2);
          if (cornerCut) continue;
        }

        const isEdge = gx === 0 || gx === 23 || gy === 0 || gy === 23;
        const isInnerRim = gx === 1 || gx === 22 || gy === 1 || gy === 22;
        let hex = '#091124';
        if (isEdge) {
          hex = gy < 12 ? '#1e3a5f' : '#0f292e';
        } else if (isInnerRim) {
          hex = (gx + gy) % 2 === 0 ? '#112240' : '#0c1a33';
        } else if (gy >= 16) {
          hex = (gx + gy) % 2 === 0 ? '#0c2128' : '#091926';
        } else if (gy >= 8) {
          hex = '#0c1730';
        }

        const [r, g, b, a] = hexToRgba(hex);
        const idx = (py * canvasSize + px) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
      }
    }
  }

  const gridH = grid.length;
  const gridW = grid[0].length;
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const ch = grid[gy][gx];
      const hex = PALETTE[ch];
      if (!hex) continue;
      const [r, g, b, a] = hexToRgba(hex);
      const startX = Math.floor((offsetX + gx) * scale);
      const startY = Math.floor((offsetY + gy) * scale);
      const endX = Math.floor((offsetX + gx + 1) * scale);
      const endY = Math.floor((offsetY + gy + 1) * scale);
      for (let py = startY; py < endY; py++) {
        if (py < 0 || py >= canvasSize) continue;
        for (let px = startX; px < endX; px++) {
          if (px < 0 || px >= canvasSize) continue;
          if (!isInsideMask(px, py, canvasSize, circular)) continue;
          const idx = (py * canvasSize + px) * 4;
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = a;
        }
      }
    }
  }
  return buf;
}

const DENSITIES = [
  { name: 'mdpi', legacySize: 48, fgSize: 108 },
  { name: 'hdpi', legacySize: 72, fgSize: 162 },
  { name: 'xhdpi', legacySize: 96, fgSize: 216 },
  { name: 'xxhdpi', legacySize: 144, fgSize: 324 },
  { name: 'xxxhdpi', legacySize: 192, fgSize: 432 }
];

for (const density of DENSITIES) {
  const dir = join(RES_DIR, `mipmap-${density.name}`);
  mkdirSync(dir, { recursive: true });

  const fgScale = density.fgSize / 54;
  const fgBuf = renderSpriteToBuffer(MASCOT_36, density.fgSize, 9, 9, fgScale, 'transparent');
  writeFileSync(
    join(dir, 'ic_launcher_foreground.png'),
    encodePngRgba(density.fgSize, density.fgSize, fgBuf)
  );

  const legacyScale = density.legacySize / 24;
  const legacySquareBuf = renderSpriteToBuffer(
    MASCOT_24,
    density.legacySize,
    0,
    0,
    legacyScale,
    'square'
  );
  writeFileSync(
    join(dir, 'ic_launcher.png'),
    encodePngRgba(density.legacySize, density.legacySize, legacySquareBuf)
  );

  const legacyRoundBuf = renderSpriteToBuffer(
    MASCOT_24,
    density.legacySize,
    0,
    0,
    legacyScale,
    'round'
  );
  writeFileSync(
    join(dir, 'ic_launcher_round.png'),
    encodePngRgba(density.legacySize, density.legacySize, legacyRoundBuf)
  );
}

writeFileSync(
  join(RES_DIR, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#091124</color>
</resources>
`,
  'utf-8'
);

writeFileSync(
  join(RES_DIR, 'drawable', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="27"
    android:viewportHeight="27">
    <path android:fillColor="#091124" android:pathData="M0,0h27v27h-27z" />
    <path android:fillColor="#0c1730" android:pathData="M0,9h27v18h-27z" />
    <path android:fillColor="#0c2128" android:pathData="M0,18h27v9h-27z" />
    <path android:fillColor="#0f2f2b" android:pathData="M6,19h15v5h-15z" />
    <path android:fillColor="#164e63" android:pathData="M5,4h1v1h-1zM22,6h1v1h-1zM4,15h1v1h-1z" />
    <path android:fillColor="#38bdf8" android:pathData="M6,6h1v1h-1zM21,13h1v1h-1z" />
    <path android:fillColor="#fef08a" android:pathData="M20,4h1v1h-1zM5,21h1v1h-1z" />
</vector>
`,
  'utf-8'
);

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
writeFileSync(join(RES_DIR, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptiveXml, 'utf-8');
writeFileSync(join(RES_DIR, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptiveXml, 'utf-8');

const rects = [];
for (let y = 0; y < MASCOT_24.length; y++) {
  for (let x = 0; x < MASCOT_24[y].length; x++) {
    const hex = PALETTE[MASCOT_24[y][x]];
    if (hex) {
      rects.push(`  <rect x="${x}" y="${y}" width="1" height="1" fill="${hex}"/>`);
    }
  }
}

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <rect width="24" height="24" rx="4" fill="#091124"/>
  <rect x="0" y="16" width="24" height="8" rx="2" fill="#0c2128"/>
  <rect x="3" y="3" width="1" height="1" fill="#38bdf8"/>
  <rect x="20" y="5" width="1" height="1" fill="#fef08a"/>
${rects.join('\n')}
</svg>
`;
writeFileSync(PUBLIC_FAVICON, faviconSvg, 'utf-8');

console.log('Polished pixel art app icons and favicon generated successfully!');
