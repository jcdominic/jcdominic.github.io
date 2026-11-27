// Every texture in the apartment is drawn here, pixel by pixel, on small canvases.
// 16 pixels = 1 block. Nothing is loaded from image files.

const BLOCK = 16;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex, f) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return "#" + rgb(hex).map((v) => c(v).toString(16).padStart(2, "0")).join("");
}

function make(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function noise(ctx, x0, y0, w, h, hex, amount, r) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) px(ctx, x, y, shade(hex, 1 + (r() - 0.5) * amount));
}

// ---------- tiling block textures ----------

export function solid(hex, amount = 0.08, seed = 1) {
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, BLOCK, BLOCK, hex, amount, rng(seed));
  return c;
}

export function planks(hex = "#b8875a", seed = 7) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  for (let row = 0; row < 4; row++) {
    const tint = 0.92 + r() * 0.16;
    const seam = Math.floor(r() * 16);
    for (let y = row * 4; y < row * 4 + 4; y++) {
      for (let x = 0; x < BLOCK; x++) {
        let f = tint * (1 + (r() - 0.5) * 0.08);
        if (y === row * 4 + 3) f *= 0.72; // gap between planks
        else if (x === seam) f *= 0.78; // board ends
        else if (r() < 0.08) f *= 0.88; // grain
        px(ctx, x, y, shade(hex, f));
      }
    }
  }
  return c;
}

// Smooth painted drywall: barely any texture, so walls read as paint, not sand.
export function paint(hex = "#f1ece3", seed = 3) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, BLOCK, BLOCK, hex, 0.018, r);
  return c;
}

// White subway tile for the kitchen backsplash.
export function tile(hex = "#f4f2ee", seed = 61) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, BLOCK, BLOCK, hex, 0.03, r);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    px(ctx, 0, y + 3, "#cfc9bf", 16, 1);
    const off = row % 2 ? 4 : 0;
    for (let x = off; x < 16; x += 8) px(ctx, x, y, "#cfc9bf", 1, 3);
    px(ctx, 0, y, shade(hex, 1.04), 16, 1); // glaze highlight
  }
  return c;
}

export function fabric(hex, seed = 5) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  for (let y = 0; y < BLOCK; y++)
    for (let x = 0; x < BLOCK; x++) {
      const weave = (x + y) % 2 === 0 ? 1.03 : 0.96;
      px(ctx, x, y, shade(hex, weave * (1 + (r() - 0.5) * 0.1)));
    }
  return c;
}

export function stone(hex = "#8d9299", seed = 11) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, BLOCK, BLOCK, hex, 0.1, r);
  for (let i = 0; i < 14; i++)
    px(ctx, Math.floor(r() * 16), Math.floor(r() * 16), shade(hex, r() < 0.5 ? 0.7 : 1.25));
  return c;
}

export function cabinet(hex = "#c9a27a", seed = 13) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, BLOCK, BLOCK, hex, 0.06, r);
  ctx.fillStyle = shade(hex, 0.72);
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);
  noise(ctx, 3, 3, 10, 10, shade(hex, 0.93), 0.05, r);
  px(ctx, 3, 3, shade(hex, 0.8), 10, 1);
  px(ctx, 3, 3, shade(hex, 0.8), 1, 10);
  px(ctx, 7, 5, "#4a4a4a", 2, 1); // knob
  return c;
}

export function stove() {
  const r = rng(17);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, 16, 16, "#26272b", 0.12, r);
  const ring = (cx, cy) => {
    for (let y = -3; y <= 3; y++)
      for (let x = -3; x <= 3; x++) {
        const d = Math.hypot(x, y);
        if (d > 2 && d < 3.4) px(ctx, cx + x, cy + y, "#6b6e75");
        if (d < 1) px(ctx, cx + x, cy + y, "#4a4c52");
      }
  };
  ring(4, 4);
  ring(11, 11);
  ring(11, 4);
  ring(4, 11);
  return c;
}

export function sink() {
  const r = rng(19);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, 16, 16, "#b9c0c7", 0.06, r);
  noise(ctx, 2, 2, 12, 12, "#7f868e", 0.08, r);
  px(ctx, 7, 7, "#3c4047", 2, 2); // drain
  return c;
}

export function leaves(seed = 23) {
  const r = rng(seed);
  const [c, ctx] = make(BLOCK, BLOCK);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (r() < 0.12) continue; // little holes, like fancy leaves
      const greens = ["#3f7d3a", "#4f9a45", "#336a2f", "#5cad4f"];
      px(ctx, x, y, greens[Math.floor(r() * greens.length)]);
    }
  return c;
}

export function keyboard() {
  const r = rng(29);
  const [c, ctx] = make(BLOCK, BLOCK);
  noise(ctx, 0, 0, 16, 16, "#2d2f34", 0.08, r);
  for (let y = 1; y < 16; y += 2) for (let x = (y % 4 === 1 ? 0 : 1); x < 16; x += 2) px(ctx, x, y, "#5a5e66");
  return c;
}

export function paper() {
  const [c, ctx] = make(BLOCK, BLOCK);
  px(ctx, 0, 0, "#f7f5ee", 16, 16);
  for (let y = 3; y < 15; y += 2) px(ctx, 2, y, "#a9b4c2", 6 + ((y * 7) % 7), 1);
  px(ctx, 2, 1, "#4a5568", 7, 1);
  return c;
}

// ---------- one-off "art" textures (stretched over a whole face) ----------

export function door() {
  const r = rng(31);
  const w = 20, h = 36;
  const [c, ctx] = make(w, h);
  noise(ctx, 0, 0, w, h, "#8b5a2b", 0.08, r);
  const panel = (x, y, pw, ph) => {
    px(ctx, x, y, "#6f4520", pw, 1);
    px(ctx, x, y, "#6f4520", 1, ph);
    px(ctx, x, y + ph - 1, "#a5703d", pw, 1);
    px(ctx, x + pw - 1, y, "#a5703d", 1, ph);
  };
  panel(3, 3, 14, 13);
  panel(3, 19, 14, 14);
  px(ctx, 15, 17, "#e2b33c", 2, 2); // knob
  px(ctx, 15, 17, "#fbe08a");
  return c;
}

export function fridgeFront(seed = 37) {
  const r = rng(seed);
  const w = 16, h = 42;
  const [c, ctx] = make(w, h);
  noise(ctx, 0, 0, w, h, "#e9ecef", 0.04, r);
  px(ctx, 0, 13, "#9aa1a9", w, 1); // freezer seam
  px(ctx, 13, 4, "#a7adb5", 1, 7); // handles
  px(ctx, 13, 16, "#a7adb5", 1, 12);
  px(ctx, 12, 4, "#cfd4d9", 1, 7);
  px(ctx, 12, 16, "#cfd4d9", 1, 12);
  return c;
}

export function rug(w = 40, h = 64) {
  const r = rng(41);
  const [c, ctx] = make(w, h);
  noise(ctx, 0, 0, w, h, "#9b2f2f", 0.1, r);
  const cream = "#e8dcc0";
  px(ctx, 1, 1, cream, w - 2, 1);
  px(ctx, 1, h - 2, cream, w - 2, 1);
  px(ctx, 1, 1, cream, 1, h - 2);
  px(ctx, w - 2, 1, cream, 1, h - 2);
  px(ctx, 3, 3, "#1f3b5a", w - 6, 1);
  px(ctx, 3, h - 4, "#1f3b5a", w - 6, 1);
  px(ctx, 3, 3, "#1f3b5a", 1, h - 6);
  px(ctx, w - 4, 3, "#1f3b5a", 1, h - 6);
  for (let y = 6; y < h - 6; y++)
    for (let x = 6; x < w - 6; x++) {
      const d = (Math.abs(((x - 6) % 10) - 5) + Math.abs(((y - 6) % 10) - 5));
      if (d === 4) px(ctx, x, y, cream);
      else if (d === 1) px(ctx, x, y, "#d69e2e");
    }
  return c;
}

const BOOK_COLORS = ["#8b2e2e", "#2e4a8b", "#2e7d4f", "#c9a227", "#6b3f8b", "#d9d4c5", "#3b3b3b", "#b85c2a", "#245c5c", "#7a1f4a"];

export function bookshelf(w = 48, h = 48, seed = 43) {
  const r = rng(seed);
  const [c, ctx] = make(w, h);
  const wood = "#6b4527";
  noise(ctx, 0, 0, w, h, "#2a1a10", 0.15, r); // back of the shelf
  const boards = [0, 15, 31, h - 2];
  for (let i = 0; i < boards.length - 1; i++) {
    const top = boards[i] + 2;
    const bottom = boards[i + 1];
    let x = 2;
    while (x < w - 2) {
      if (r() < 0.07) { x += 2; continue; } // gap
      const bw = 1 + Math.floor(r() * 3);
      const bh = Math.min(bottom - top, 8 + Math.floor(r() * 6));
      const color = BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)];
      const tint = 0.85 + r() * 0.25;
      for (let bx = x; bx < Math.min(x + bw, w - 2); bx++) {
        for (let by = bottom - bh; by < bottom; by++) px(ctx, bx, by, shade(color, tint * (bx === x ? 1.12 : 1)));
        px(ctx, bx, bottom - bh + 2, shade(color, tint * 1.45)); // spine bands
        px(ctx, bx, bottom - 3, shade(color, tint * 1.45));
      }
      x += bw;
    }
  }
  for (const b of boards) noise(ctx, 0, b, w, 2, wood, 0.12, r);
  noise(ctx, 0, 0, 2, h, wood, 0.12, r);
  noise(ctx, w - 2, 0, 2, h, wood, 0.12, r);
  return c;
}

// Rough outline of the lower 48 (lon, lat), clockwise from the Olympic Peninsula.
const US = [
  [-124.7, 48.4], [-123.0, 49.0], [-95.2, 49.0], [-89.6, 48.0], [-84.8, 46.5], [-82.4, 43.0],
  [-83.1, 42.0], [-78.9, 42.9], [-79.0, 43.3], [-76.3, 44.2], [-74.7, 45.0], [-71.5, 45.0],
  [-70.0, 46.7], [-69.2, 47.4], [-67.8, 47.1], [-67.8, 45.7], [-67.0, 44.8], [-70.2, 43.6],
  [-70.6, 42.6], [-70.0, 41.8], [-71.5, 41.4], [-73.9, 40.6], [-74.0, 39.6], [-75.0, 38.8],
  [-76.0, 37.0], [-75.5, 35.2], [-77.9, 33.9], [-79.9, 32.7], [-81.4, 30.4], [-80.0, 26.8],
  [-80.4, 25.2], [-81.8, 26.1], [-82.7, 28.0], [-83.7, 29.9], [-85.4, 29.7], [-87.6, 30.3],
  [-89.4, 30.2], [-89.2, 29.2], [-91.0, 29.3], [-93.8, 29.7], [-95.0, 29.2], [-97.2, 27.7],
  [-97.2, 25.9], [-99.5, 27.5], [-101.4, 29.8], [-103.0, 29.0], [-104.5, 29.7], [-106.5, 31.8],
  [-108.2, 31.8], [-108.2, 31.3], [-111.1, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-118.4, 33.8],
  [-120.6, 34.6], [-121.9, 36.6], [-122.5, 37.7], [-123.8, 39.8], [-124.4, 40.4], [-124.2, 42.0],
  [-124.0, 46.2],
];

const AT = [
  [-84.19, 34.63], [-83.5, 35.6], [-80.7, 37.3], [-77.7, 39.3], [-75.5, 40.8], [-73.9, 41.3],
  [-73.1, 42.7], [-71.8, 43.9], [-70.5, 44.5], [-68.9, 45.9],
];

// The wall map. `parks` is a list of { lat, lon }. Returns a 72x40 canvas.
export function map(parks = [], w = 72, h = 40) {
  const r = rng(47);
  const [c, ctx] = make(w, h);
  const m = 2; // frame width
  const mw = w - m * 2, mh = h - m * 2;
  const project = (lon, lat) => [((lon + 126) / 60) * mw, ((50.5 - lat) / 27) * mh];

  const [mask, mctx] = make(mw, mh);
  mctx.beginPath();
  US.forEach(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    i ? mctx.lineTo(x, y) : mctx.moveTo(x, y);
  });
  mctx.closePath();
  mctx.fill();
  const alpha = mctx.getImageData(0, 0, mw, mh).data;
  const land = (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && alpha[(y * mw + x) * 4 + 3] > 110;

  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      let color;
      if (land(x, y)) {
        const lon = (x / mw) * 60 - 126 + (r() - 0.5) * 3;
        const base = lon < -104 ? "#c9b27b" : lon < -97 ? "#a8b86a" : "#6aa84f";
        const coast = !land(x - 1, y) || !land(x + 1, y) || !land(x, y - 1) || !land(x, y + 1);
        color = shade(base, coast ? 0.78 : 1 + (r() - 0.5) * 0.12);
      } else {
        color = shade("#3f6fa3", r() < 0.06 ? 1.25 : 1 + (r() - 0.5) * 0.06);
      }
      px(ctx, x + m, y + m, color);
    }

  AT.forEach(([lon, lat], i) => {
    if (!i) return;
    const [x0, y0] = project(...AT[i - 1]);
    const [x1, y1] = project(lon, lat);
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s < steps; s += 2) {
      const t = s / steps;
      px(ctx, Math.round(x0 + (x1 - x0) * t) + m, Math.round(y0 + (y1 - y0) * t) + m, "#5b3a1a");
    }
  });

  for (const p of parks) {
    if (p.lat == null) continue;
    const [x, y] = project(p.lon, p.lat).map(Math.round);
    px(ctx, x + m - 1, y + m - 1, "#e53e3e", 2, 2);
    px(ctx, x + m - 1, y + m - 1, "#feb2b2");
  }

  const wood = "#5b3a24";
  px(ctx, 0, 0, wood, w, m);
  px(ctx, 0, h - m, wood, w, m);
  px(ctx, 0, 0, wood, m, h);
  px(ctx, w - m, 0, wood, m, h);
  return c;
}

// San Francisco, roughly, through the window. 64x32.
export function windowView() {
  const r = rng(53);
  const w = 64, h = 32;
  const [c, ctx] = make(w, h);
  const sky = ["#6fa6de", "#80b3e4", "#93c0ea", "#a8cdef", "#bcd9f2"];
  for (let y = 0; y < 22; y++) px(ctx, 0, y, sky[Math.min(4, Math.floor(y / 4.5))], w, 1);
  const cloud = (cx, cy, len) => {
    px(ctx, cx, cy, "#ffffff", len, 2);
    px(ctx, cx + 2, cy - 1, "#ffffff", len - 4, 1);
    px(ctx, cx + 1, cy + 2, "#e6eef5", len - 2, 1);
  };
  cloud(4, 4, 12);
  cloud(36, 7, 14);
  cloud(52, 2, 9);
  // Hills across the bay
  for (let x = 0; x < w; x++) {
    const top = 17 + Math.round(Math.sin(x / 7) * 2 + Math.sin(x / 3.3) * 0.8 + (x > 40 ? 2 : 0));
    for (let y = top; y < 23; y++) px(ctx, x, y, shade("#4d6b3c", 1 + (r() - 0.5) * 0.15));
    if (r() < 0.3) px(ctx, x, top, "#d9e2ea"); // fog
  }
  for (let y = 23; y < h; y++)
    for (let x = 0; x < w; x++) px(ctx, x, y, shade("#3d6f99", r() < 0.07 ? 1.3 : 1 + (r() - 0.5) * 0.08));
  // The bridge
  const red = "#c0362c";
  const deck = 21;
  px(ctx, 2, deck, red, w - 4, 1);
  for (const tx of [18, 44]) {
    px(ctx, tx, 6, red, 2, 19);
    px(ctx, tx - 1, 9, red, 4, 1);
    px(ctx, tx - 1, 14, red, 4, 1);
  }
  const cable = (x0, y0, x1, y1, sag) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      const t = (x - x0) / (x1 - x0);
      const y = Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t));
      px(ctx, x, y, red);
      if (x % 2 === 0) for (let yy = y + 1; yy < deck; yy++) px(ctx, x, yy, "#d0675e");
    }
  };
  cable(20, 6, 44, 6, 12);
  cable(2, 18, 18, 6, 2);
  cable(46, 6, 61, 18, 2);
  return c;
}

export function monitor(cursorOn = true) {
  const r = rng(59);
  const w = 32, h = 18;
  const [c, ctx] = make(w, h);
  px(ctx, 0, 0, "#111214", w, h);
  px(ctx, 1, 1, "#1b1e2b", w - 2, h - 2);
  const colors = ["#c792ea", "#82aaff", "#c3e88d", "#f78c6c", "#89ddff", "#676e95"];
  let indent = 0;
  for (let y = 2; y < h - 2; y += 2) {
    indent = Math.max(0, Math.min(6, indent + Math.floor(r() * 5) - 2));
    let x = 2 + indent;
    const end = 6 + indent + Math.floor(r() * 18);
    while (x < Math.min(end, w - 3)) {
      const len = 1 + Math.floor(r() * 5);
      px(ctx, x, y, colors[Math.floor(r() * colors.length)], Math.min(len, w - 3 - x), 1);
      x += len + 1;
    }
  }
  if (cursorOn) px(ctx, 10, h - 4, "#ffffff", 1, 1);
  return c;
}

export function pennant(kind) {
  const w = 32, h = 16;
  const [c, ctx] = make(w, h);
  const inside = (x, y) => Math.abs(y + 0.5 - h / 2) < (h / 2) * (1 - x / w) + 0.3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      let color;
      if (kind === "bengals") {
        color = x < 3 ? "#111111" : "#fb4f14";
        const s = (x + Math.abs(y - 8) * 0.8) % 7;
        if (x > 4 && s < 1.6 && y % 6 !== 0) color = "#111111";
      } else if (kind === "lakers") {
        color = x < 3 ? "#fdb927" : "#552583";
        if (Math.abs(y + 0.5 - h / 2) < 1.6) color = "#fdb927";
      } else {
        color = x < 3 ? "#ffffff" : "#00356b";
      }
      px(ctx, x, y, color);
    }
  if (kind === "yale") text(ctx, "YALE", 5, 6, "#ffffff");
  return c;
}

// A tiny 3x5 pixel font, just the letters we need.
const GLYPHS = {
  Y: "101101010010010", A: "010101111101101", L: "100100100100111", E: "111100110100111",
  I: "111010010010111", N: "101111111111101", R: "110101110101101",
};
function text(ctx, str, x, y, color) {
  for (const ch of str) {
    const g = GLYPHS[ch];
    for (let i = 0; i < 15; i++) if (g[i] === "1") px(ctx, x + (i % 3), y + Math.floor(i / 3), color);
    x += 4;
  }
}

// Just the net; the yellow rim is built from little blocks around it.
export function spikeballNet() {
  const [c, ctx] = make(BLOCK, BLOCK);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (Math.hypot(x - 7.5, y - 7.5) < 7.6) px(ctx, x, y, (x + y) % 2 ? "#1a1a1a" : "#454545");
  return c;
}

// The TV screen, animated. Call with seconds since it was turned on, or -1 for off.
export function drawTV(ctx, t) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (t < 0) {
    px(ctx, 0, 0, "#131417", w, h);
    for (let i = 0; i < 10; i++) px(ctx, 40 + i, 4 + i, "#1d1f24", 3, 1);
    return;
  }
  if (t < 0.6) {
    const r = rng(Math.floor(t * 30));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(ctx, x, y, shade("#bbbbbb", r()));
    return;
  }
  if (t < 1.8) {
    const bars = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
    bars.forEach((b, i) => px(ctx, Math.floor((i * w) / 7), 0, b, Math.ceil(w / 7), h));
    return;
  }
  // A little looping scene: dusk over the mountains.
  const s = t - 1.8;
  const sky = ["#2b2d5c", "#4a3a7a", "#8a4f8f", "#d9707a", "#f6a96b"];
  for (let y = 0; y < h - 8; y++) px(ctx, 0, y, sky[Math.min(4, Math.floor(y / 6))], w, 1);
  const sunY = 18 + Math.round(Math.sin(s * 0.3) * 2);
  for (let y = -4; y <= 4; y++)
    for (let x = -4; x <= 4; x++) if (x * x + y * y < 18) px(ctx, 44 + x, sunY + y, "#fde68a");
  const ridge = (offset, base, amp, color, speed) => {
    for (let x = 0; x < w; x++) {
      const xx = x + s * speed + offset;
      const top = Math.round(base - Math.abs(((xx / 9) % 2) - 1) * amp - Math.sin(xx / 4) * 1.5);
      px(ctx, x, top, color, 1, h - top);
    }
  };
  ridge(0, 28, 8, "#3b2f5c", 2);
  ridge(30, 31, 6, "#231d3a", 5);
  px(ctx, 0, h - 3, "#000000", w, 3);
  px(ctx, 1, h - 2, "#e53e3e", Math.round(((s % 30) / 30) * (w - 2)), 1);
}

// ---------- 16x16 hotbar icons ----------

export function icon(id) {
  const [c, ctx] = make(16, 16);
  const box = (x, y, w, h, color) => px(ctx, x, y, color, w, h);
  switch (id) {
    case "tv":
      box(1, 2, 14, 10, "#111");
      ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000"].forEach((b, i) => box(2 + i * 2, 3, 2, 8, b));
      box(6, 12, 4, 1, "#333");
      box(4, 13, 8, 1, "#5b3a24");
      break;
    case "desk":
      box(1, 2, 14, 9, "#111");
      box(2, 3, 12, 7, "#1b1e2b");
      box(3, 4, 5, 1, "#c792ea");
      box(4, 6, 7, 1, "#82aaff");
      box(4, 8, 4, 1, "#c3e88d");
      box(7, 11, 2, 2, "#333");
      box(3, 13, 10, 1, "#333");
      break;
    case "fridge":
      box(4, 0, 8, 16, "#e9ecef");
      box(4, 0, 1, 16, "#c9ced4");
      box(4, 5, 8, 1, "#9aa1a9");
      box(10, 2, 1, 2, "#8a9199");
      box(10, 7, 1, 5, "#8a9199");
      box(6, 8, 2, 2, "#f6e05e");
      break;
    case "map":
      box(1, 3, 14, 10, "#3f6fa3");
      box(3, 5, 10, 6, "#6aa84f");
      box(3, 5, 4, 6, "#c9b27b");
      box(5, 7, 2, 2, "#e53e3e");
      box(10, 6, 2, 2, "#e53e3e");
      break;
    case "bookshelf":
      box(2, 3, 3, 12, "#8b2e2e");
      box(5, 1, 3, 14, "#2e4a8b");
      box(8, 4, 2, 11, "#c9a227");
      box(10, 2, 3, 13, "#2e7d4f");
      box(2, 5, 3, 1, "#c46a6a");
      box(5, 3, 3, 1, "#6a86c4");
      box(10, 4, 3, 1, "#6ac48f");
      box(1, 15, 14, 1, "#6b4527");
      break;
    case "dream":
      box(1, 1, 14, 14, "#f2f2f2");
      box(2, 2, 12, 12, "#2a336f");
      box(3, 7, 3, 6, "#3b3f74");
      box(7, 4, 2, 9, "#d7d3e8");
      box(10, 6, 3, 7, "#3b3f74");
      box(4, 8, 1, 1, "#ffd27a");
      box(11, 8, 1, 1, "#ffd27a");
      box(2, 10, 12, 1, "#eef2f7");
      box(2, 11, 12, 1, "#2bb3a3");
      box(3, 12, 3, 2, "#f5b7c9");
      box(10, 12, 3, 2, "#f5b7c9");
      break;
    case "window":
      box(1, 1, 14, 14, "#f2f2f2");
      box(2, 2, 12, 7, "#93c0ea");
      box(2, 9, 12, 5, "#3d6f99");
      box(5, 4, 1, 7, "#c0362c");
      box(10, 4, 1, 7, "#c0362c");
      box(2, 9, 12, 1, "#c0362c");
      box(7, 2, 1, 12, "#f2f2f2");
      break;
  }
  return c;
}

// ---------- more windows ----------

// Golden hour where the mountains meet the beach. 48x32.
export function beachView() {
  const r = rng(67);
  const w = 48, h = 32, horizon = 18;
  const [c, ctx] = make(w, h);
  const sky = ["#3d5a9e", "#5d6fb3", "#9a83b8", "#d9919a", "#f2a77f", "#f9c97c"];
  for (let y = 0; y < horizon; y++) px(ctx, 0, y, sky[Math.min(5, Math.floor(y / 3))], w, 1);
  for (let y = -5; y < 0; y++)
    for (let x = -5; x <= 5; x++) if (x * x + (y + 0.5) * (y + 0.5) < 22) px(ctx, 14 + x, horizon + y, y > -3 ? "#fff6c8" : "#ffe9a0");
  for (const [bx, by] of [[30, 4], [34, 6], [8, 7]]) {
    px(ctx, bx, by, "#3a2f4a");
    px(ctx, bx + 2, by, "#3a2f4a");
    px(ctx, bx + 1, by + 1, "#3a2f4a");
  }
  // Ocean, with the sun's reflection broken up by the swell
  for (let y = horizon; y < 25; y++)
    for (let x = 0; x < w; x++) px(ctx, x, y, shade("#3f6f9a", 1 + (r() - 0.5) * 0.1 + (y - horizon) * 0.02));
  for (let y = horizon; y < 25; y += 2) {
    const half = 5 - (y - horizon) * 0.6;
    px(ctx, Math.round(14 - half), y, "#ffd99a", Math.round(half * 2) + 1, 1);
  }
  // Mountains rolling down to the water on the right
  const ridge = (x, base, slope, wobble) => Math.round(base + slope * x + Math.sin(x / wobble) * 2);
  for (let x = 18; x < w; x++) {
    const far = ridge(48 - x, 3, 0.5, 3.1);
    for (let y = far; y < horizon; y++) px(ctx, x, y, shade("#7a6f9e", 1 + (r() - 0.5) * 0.06));
  }
  for (let x = 26; x < w; x++) {
    const near = ridge(48 - x, 8, 0.6, 2.3);
    for (let y = near; y < 26; y++) px(ctx, x, y, shade(y < near + 2 ? "#4f7a52" : "#40624a", 1 + (r() - 0.5) * 0.12));
    if (x % 3 === 0 && near < horizon) {
      // pines along the ridge
      px(ctx, x, near - 3, "#2c4a36");
      px(ctx, x - 1, near - 2, "#2c4a36", 3, 2);
    }
  }
  // Surf and sand
  for (let y = 25; y < h; y++)
    for (let x = 0; x < w; x++) px(ctx, x, y, shade(y < 27 ? "#cdb07c" : "#ead29d", 1 + (r() - 0.5) * 0.1));
  for (let x = 0; x < 30; x++) {
    if ((x + 1) % 7 > 1) px(ctx, x, 24, "#ffffff");
    if ((x + 4) % 9 > 3) px(ctx, x, 25, "#e8f1f5");
  }
  return c;
}

// San Francisco as it could be: homes on every hill, trains everywhere. 64x32.
// The background is drawn once; drawDream() adds the moving train and streetcar.
export function dreamBackground() {
  const r = rng(71);
  const w = 64, h = 32;
  const [c, ctx] = make(w, h);
  const sky = ["#1d2457", "#2a336f", "#433f88", "#6c5099", "#a5609b", "#d9798f", "#f2a07f"];
  for (let y = 0; y < 20; y++) px(ctx, 0, y, sky[Math.min(6, Math.floor(y / 3))], w, 1);
  for (let i = 0; i < 14; i++) px(ctx, Math.floor(r() * w), Math.floor(r() * 7), "#e8e6ff");
  px(ctx, 56, 2, "#fff6d6", 2, 3); // moon
  px(ctx, 58, 2, "#fff6d6", 1, 1);
  px(ctx, 58, 4, "#fff6d6", 1, 1);

  // Twin Peaks and a radio tower
  for (let x = 0; x < w; x++) {
    const top = Math.round(15 - Math.max(0, 5 - Math.abs(x - 9) * 0.5) - Math.max(0, 3 - Math.abs(x - 18) * 0.4));
    px(ctx, x, top, "#3a3566", 1, 20 - top);
  }
  for (const tx of [7, 9, 11]) px(ctx, tx, 4, "#c9c3e0", 1, 6);
  px(ctx, 7, 7, "#c9c3e0", 5, 1);
  px(ctx, 8, 10, "#c9c3e0", 3, 1);

  const lit = ["#ffd27a", "#ffe9b0", "#7fe0d0", "#ffd27a"];
  const building = (x0, bw, top, col, roof) => {
    px(ctx, x0, top, col, bw, 22 - top);
    for (let y = top + 1; y < 21; y += 2)
      for (let x = x0 + 1; x < x0 + bw - 1; x += 2) if (r() < 0.55) px(ctx, x, y, lit[Math.floor(r() * 4)]);
    if (roof === "green") px(ctx, x0, top - 1, "#5fa36a", bw, 1);
  };
  // Skyline: dense, tall, and lit up
  let x = 0;
  while (x < w) {
    const bw = 3 + Math.floor(r() * 4);
    const top = 9 + Math.floor(r() * 8);
    building(x, bw, top, ["#2b2f5a", "#323a6b", "#3b3f74", "#2e4466"][Math.floor(r() * 4)], r() < 0.4 ? "green" : null);
    x += bw;
  }
  // A pyramid tower
  for (let y = 2; y < 22; y++) {
    const half = Math.floor((y - 2) / 4);
    px(ctx, 40 - half, y, "#d7d3e8", half * 2 + 1, 1);
  }
  px(ctx, 40, 1, "#ff6b6b");
  // A pagoda-roofed tower
  px(ctx, 25, 5, "#3a2f5e", 4, 17);
  for (const y of [5, 9, 13]) {
    px(ctx, 23, y, "#d9534f", 8, 1);
    px(ctx, 22, y + 1, "#a33a37", 1, 1);
    px(ctx, 31, y + 1, "#a33a37", 1, 1);
  }
  px(ctx, 26, 3, "#d9534f", 2, 2);
  for (let y = 7; y < 21; y += 2) px(ctx, 26, y, "#ffd27a", 2, 1);

  // The elevated line
  px(ctx, 0, 21, "#9aa0bd", w, 1);
  px(ctx, 0, 22, "#6f7494", w, 1);
  for (let x = 3; x < w; x += 10) px(ctx, x, 23, "#6f7494", 2, 3);

  // Row houses and cherry trees down at street level
  const houses = ["#e8a0a8", "#f2d48f", "#9fd3c7", "#b9a3e3", "#f4b183", "#a8d08d"];
  for (let x = 0; x < w; x += 4) {
    const top = 23 + Math.floor(r() * 2);
    px(ctx, x, top, houses[(x / 4) % houses.length], 4, 30 - top);
    px(ctx, x, top, shade(houses[(x / 4) % houses.length], 0.75), 4, 1);
    px(ctx, x + 1, top + 2, r() < 0.7 ? "#ffe9b0" : "#4a4a6a", 1, 2);
    px(ctx, x + 2, top + 2, r() < 0.7 ? "#ffe9b0" : "#4a4a6a", 1, 2);
  }
  for (let x = 2; x < w; x += 7 + Math.floor(r() * 3)) {
    px(ctx, x + 1, 27, "#5a3b2a", 1, 3);
    px(ctx, x - 1, 24, "#f5b7c9", 5, 3);
    px(ctx, x, 23, "#f5b7c9", 3, 1);
    px(ctx, x, 25, "#e88aa8", 1, 1);
    px(ctx, x + 2, 24, "#fde2ea", 1, 1);
  }
  px(ctx, 0, 30, "#2f3045", w, 2); // street
  for (let x = 1; x < w; x += 6) px(ctx, x, 31, "#f6e05e", 2, 1);
  return c;
}

export function drawDream(ctx, background, t) {
  const w = ctx.canvas.width;
  ctx.drawImage(background, 0, 0);
  // Train on the elevated line, every few seconds
  const tx = Math.round(((t * 14) % (w + 60)) - 30);
  px(ctx, tx, 18, "#eef2f7", 24, 3);
  px(ctx, tx + 24, 19, "#eef2f7", 2, 2); // nose
  px(ctx, tx + 26, 20, "#eef2f7", 1, 1);
  px(ctx, tx, 20, "#2bb3a3", 26, 1);
  for (let i = 1; i < 23; i += 2) px(ctx, tx + i, 19, i % 8 === 7 ? "#c9d1dc" : "#ffe9b0");
  // Streetcar going the other way
  const sx = Math.round(w + 20 - ((t * 6) % (w + 40)));
  px(ctx, sx, 27, "#c53030", 8, 3);
  px(ctx, sx, 27, "#f4e6c8", 8, 1);
  px(ctx, sx + 1, 28, "#ffe9b0", 1, 1);
  px(ctx, sx + 3, 28, "#ffe9b0", 1, 1);
  px(ctx, sx + 5, 28, "#ffe9b0", 1, 1);
  px(ctx, sx + 4, 25, "#2f3045", 1, 2); // pole
}

// ---------- devotional art ----------

// Our Lady of Guadalupe, in a gold frame. 24x36.
export function guadalupe() {
  const r = rng(73);
  const w = 24, h = 36, cx = 11.5;
  const [c, ctx] = make(w, h);
  px(ctx, 0, 0, "#4a2418", w, h);
  // Rays of light around her
  for (let y = 2; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) {
      const dx = (x - cx) / 9.5, dy = (y - 17) / 15;
      if (dx * dx + dy * dy < 1) {
        const a = Math.atan2(y - 17, x - cx);
        px(ctx, x, y, Math.floor(a * 9 + 20) % 2 ? "#f6c343" : "#e89a2c");
      }
    }
  // Mantle, star-covered
  const mantleHalf = (y) => 2.2 + (y - 5) * 0.2;
  for (let y = 5; y < 29; y++) {
    const hw = mantleHalf(y);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const edge = x === Math.round(cx - hw) || x === Math.round(cx + hw);
      px(ctx, x, y, edge ? "#e0b84a" : r() < 0.1 ? "#f6d76b" : "#2f7d73");
    }
  }
  // Rose dress with gold flowers
  for (let y = 10; y < 29; y++) {
    const hw = mantleHalf(y) * 0.5;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) px(ctx, x, y, r() < 0.12 ? "#f0c070" : "#d9727a");
  }
  px(ctx, 10, 16, "#3a2a4a", 4, 1); // sash
  // Face, tilted slightly, and hands joined in prayer
  px(ctx, 10, 6, "#c58b62", 3, 3);
  px(ctx, 10, 6, "#a8714c", 1, 1);
  px(ctx, 11, 7, "#8a5a3a", 1, 1);
  px(ctx, 11, 12, "#c58b62", 2, 3);
  px(ctx, 11, 11, "#c58b62", 1, 1);
  // Crescent moon and the angel beneath her
  for (let x = 7; x <= 16; x++) px(ctx, x, 29 + (x === 7 || x === 16 ? -1 : 0), "#2a2a2a");
  px(ctx, 11, 30, "#c58b62", 2, 2);
  px(ctx, 8, 30, "#c53030", 1, 2);
  px(ctx, 9, 30, "#f4f1ea", 1, 2);
  px(ctx, 10, 30, "#2f855a", 1, 2);
  px(ctx, 13, 30, "#2f855a", 1, 2);
  px(ctx, 14, 30, "#f4f1ea", 1, 2);
  px(ctx, 15, 30, "#c53030", 1, 2);
  // Gold frame
  for (const [fx, fy, fw, fh] of [[0, 0, w, 1], [0, h - 1, w, 1], [0, 0, 1, h], [w - 1, 0, 1, h]]) px(ctx, fx, fy, "#c9a227", fw, fh);
  for (const [fx, fy, fw, fh] of [[1, 1, w - 2, 1], [1, h - 2, w - 2, 1], [1, 1, 1, h - 2], [w - 2, 1, 1, h - 2]]) px(ctx, fx, fy, "#8a6a14", fw, fh);
  return c;
}

// The figure on the crucifix, on a transparent background. 16x20.
export function corpus() {
  const [c, ctx] = make(16, 20);
  const ivory = "#e8dcc0", shadow = "#c4ae86";
  px(ctx, 1, 5, ivory, 14, 1); // arms
  px(ctx, 2, 6, shadow, 4, 1);
  px(ctx, 10, 6, shadow, 4, 1);
  px(ctx, 7, 2, "#6b4a2a", 2, 1); // hair
  px(ctx, 7, 3, ivory, 2, 2); // head, bowed
  px(ctx, 6, 5, ivory, 4, 6); // torso
  px(ctx, 6, 7, shadow, 1, 3);
  px(ctx, 6, 11, "#f7f4ec", 4, 2); // cloth
  px(ctx, 7, 13, ivory, 2, 5); // legs
  px(ctx, 7, 14, shadow, 1, 3);
  px(ctx, 7, 18, ivory, 2, 1);
  return c;
}

// The top of the pint glass: dark stout with a white capital G just under the head,
// where the wordmark sits on the real glass (so you can split the G). 14x10.
export function pintFront() {
  const r = rng(79);
  const [c, ctx] = make(14, 10);
  noise(ctx, 0, 0, 14, 10, "#1e0f0a", 0.15, r);
  const g = [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."];
  g.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && px(ctx, 5 + x, 1 + y, "#f4f1ea")));
  return c;
}
