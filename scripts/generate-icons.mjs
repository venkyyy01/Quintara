/**
 * Generates the Quintara PWA PNG icons (192 and 512) with a minimal
 * dependency-free PNG encoder. Run: node scripts/generate-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    pixels.copy(
      raw,
      y * (width * 4 + 1) + 1,
      y * width * 4,
      (y + 1) * width * 4,
    );
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size * 0.35;
  const cy = size * 0.28;

  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels[offset] = r;
    pixels[offset + 1] = g;
    pixels[offset + 2] = b;
    pixels[offset + 3] = a;
  };

  const mix = (t, c1, c2) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded-rect mask.
      const radius = size * 0.22;
      const dx = Math.max(radius - x, 0, x - (size - radius));
      const dy = Math.max(radius - y, 0, y - (size - radius));
      const corner = Math.sqrt(dx * dx + dy * dy);
      const inside = corner <= radius + 0.5;
      if (!inside) {
        set(x, y, 0, 0, 0, 0);
        continue;
      }
      // Background radial gradient.
      const dist = Math.hypot(x - cx, y - cy) / (size * 1.1);
      const [r, g, b] = mix(Math.min(1, dist), [34, 44, 58], [13, 17, 23]);
      set(x, y, r, g, b);
    }
  }

  const gold = [215, 173, 98];
  const goldLight = [246, 217, 154];
  const nodes = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.75],
    [0.25, 0.5],
    [0.75, 0.5],
  ];

  // Draw edges between nodes (lattice motif).
  const drawLine = (x0, y0, x1, y1, thickness) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          if (ox * ox + oy * oy <= thickness * thickness) {
            set(Math.round(px + ox), Math.round(py + oy), ...gold, 230);
          }
        }
      }
    }
  };

  const thickness = Math.max(2, Math.round(size * 0.022));
  const points = nodes.map(([nx, ny]) => [nx * size, ny * size]);
  const edges = [
    [0, 1],
    [0, 2],
    [1, 2],
    [0, 3],
    [1, 4],
    [3, 4],
    [3, 2],
    [4, 2],
  ];
  for (const [a, b] of edges) {
    drawLine(points[a][0], points[a][1], points[b][0], points[b][1], thickness);
  }

  // Draw nodes.
  for (const [px, py] of points) {
    const radius = size * 0.055;
    for (let y = Math.floor(py - radius); y <= py + radius; y++) {
      for (let x = Math.floor(px - radius); x <= px + radius; x++) {
        const dist = Math.hypot(x - px, y - py);
        if (dist <= radius) {
          const shade = 1 - dist / radius;
          const [r, g, b] = mix(1 - shade, gold, goldLight);
          set(x, y, r, g, b);
        }
      }
    }
  }

  return encodePng(size, size, pixels);
}

const outDir = join(root, "apps/web/public/icons");
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const png = drawIcon(size);
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
