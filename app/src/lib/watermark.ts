// Invisible per-viewer watermark. A 32-bit payload (8-bit magic + 24-bit viewer code) is written as
// tiny brightness nudges (+/-DELTA on blue) in CELL x CELL blocks, laid out in an 8x4-block tile
// repeated over the whole image. Decoding compares each block with its surroundings and votes across
// every repetition, so it survives screenshots, crops, colour-profile shifts and light compression.
// It does not survive heavy resizing or a phone photo of the screen; the visible mark covers those.

const MAGIC = 0xa5;
const CELL = 8;
const TW = 8;
const TH = 4;
const DELTA = 4;

function payloadBits(code: number) {
  const v = ((MAGIC << 24) | (code & 0xffffff)) >>> 0;
  return Array.from({ length: 32 }, (_, i) => (v >>> (31 - i)) & 1);
}

export function embed(img: ImageData, code: number) {
  const bits = payloadBits(code);
  const { data, width, height } = img;
  for (let y = 0; y < height; y++) {
    const cy = Math.floor(y / CELL) % TH;
    for (let x = 0; x < width; x++) {
      const bit = bits[(Math.floor(x / CELL) % TW) + TW * cy];
      const i = (y * width + x) * 4 + 2;
      data[i] = Math.max(0, Math.min(255, data[i] + (bit ? DELTA : -DELTA)));
    }
  }
}

export function extract(img: ImageData): number | null {
  const { data, width: w, height: h } = img;
  // Integral image of the blue channel for O(1) block sums.
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += data[((y - 1) * w + (x - 1)) * 4 + 2];
      I[y * (w + 1) + x] = I[(y - 1) * (w + 1) + x] + row;
    }
  }
  const sum = (x0: number, y0: number, x1: number, y1: number) =>
    I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];

  let best: { code: number; score: number } | null = null;
  for (let oy = 0; oy < CELL * TH; oy += 2) {
    for (let ox = 0; ox < CELL * TW; ox += 2) {
      const acc = new Float64Array(32);
      for (let y0 = oy + CELL; y0 + 2 * CELL <= h; y0 += CELL) {
        const cy = Math.round((y0 - oy) / CELL) % TH;
        for (let x0 = ox + CELL; x0 + 2 * CELL <= w; x0 += CELL) {
          const cx = Math.round((x0 - ox) / CELL) % TW;
          const m = sum(x0, y0, x0 + CELL, y0 + CELL) / (CELL * CELL);
          const n = sum(x0 - CELL, y0 - CELL, x0 + 2 * CELL, y0 + 2 * CELL) / (9 * CELL * CELL);
          acc[cx + TW * cy] += m - n;
        }
      }
      let v = 0;
      let score = 0;
      for (let b = 0; b < 32; b++) {
        v = (v << 1) | (acc[b] > 0 ? 1 : 0);
        score += Math.abs(acc[b]);
      }
      v >>>= 0;
      if (v >>> 24 === MAGIC && (!best || score > best.score)) best = { code: v & 0xffffff, score };
    }
  }
  return best ? best.code : null;
}
