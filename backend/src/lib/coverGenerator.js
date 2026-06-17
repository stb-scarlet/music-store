import { makeStream, fakerSeedFor, pick, intBetween } from '../rng/seed.js';

const SIZE = 640;

// Design palettes (visual design choice, not locale-specific content — fine to keep in source).
const PALETTES = [
  ['#1b1f3b', '#6a4c93', '#e0a458'],
  ['#0f4c5c', '#5fa8a0', '#f2e7d5'],
  ['#3e1f47', '#a4243b', '#e98a15'],
  ['#142d4c', '#1f6f78', '#bfd7ea'],
  ['#241623', '#6a0572', '#ab83a1'],
  ['#0b132b', '#3a506b', '#5bc0be'],
  ['#2b2d42', '#8d99ae', '#ef233c'],
  ['#1a1a2e', '#e94560', '#f0a500'],
  ['#10312b', '#6b9080', '#cce3de'],
  ['#26132e', '#c44536', '#eee5b8'],
];

const STYLES = ['radialBurst', 'concentricRings', 'halftoneGrid', 'geometricBlocks', 'waveBands', 'scatterPolygons', 'orbitDots'];

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function radialBurst(rng, palette) {
  const cx = SIZE / 2, cy = SIZE / 2;
  const wedges = intBetween(rng, 8, 16);
  const offset = rng() * 360;
  const r = SIZE * 0.85;
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  for (let i = 0; i < wedges; i++) {
    const a0 = offset + (360 / wedges) * i;
    const a1 = offset + (360 / wedges) * (i + 1);
    const x0 = cx + r * Math.cos((a0 * Math.PI) / 180);
    const y0 = cy + r * Math.sin((a0 * Math.PI) / 180);
    const x1 = cx + r * Math.cos((a1 * Math.PI) / 180);
    const y1 = cy + r * Math.sin((a1 * Math.PI) / 180);
    const fill = i % 2 === 0 ? palette[1] : palette[2];
    out += `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${fill}" opacity="${(0.55 + rng() * 0.4).toFixed(2)}"/>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${(SIZE * (0.08 + rng() * 0.05)).toFixed(1)}" fill="${palette[0]}"/>`;
  return out;
}

function concentricRings(rng, palette) {
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  const cx = SIZE / 2 + (rng() - 0.5) * 80;
  const cy = SIZE / 2 + (rng() - 0.5) * 80;
  let r = SIZE * 0.78;
  let i = 0;
  while (r > 20) {
    const fill = i % 2 === 0 ? palette[1] : palette[2];
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${(0.5 + rng() * 0.4).toFixed(2)}"/>`;
    r -= SIZE * (0.04 + rng() * 0.05);
    i++;
  }
  return out;
}

function halftoneGrid(rng, palette) {
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  const cell = intBetween(rng, 28, 44);
  const phaseX = rng() * Math.PI * 2;
  const phaseY = rng() * Math.PI * 2;
  const freq = 2 + rng() * 3;
  for (let y = cell / 2; y < SIZE; y += cell) {
    for (let x = cell / 2; x < SIZE; x += cell) {
      const wave = Math.sin((x / SIZE) * freq * Math.PI + phaseX) * Math.cos((y / SIZE) * freq * Math.PI + phaseY);
      const radius = ((wave + 1) / 2) * (cell * 0.45) + 1.5;
      const fill = wave > 0 ? palette[1] : palette[2];
      out += `<circle cx="${x}" cy="${y}" r="${radius.toFixed(1)}" fill="${fill}" opacity="0.85"/>`;
    }
  }
  return out;
}

function geometricBlocks(rng, palette) {
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  const cols = intBetween(rng, 4, 6);
  const cellW = SIZE / cols;
  for (let cy = 0; cy < cols; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (rng() < 0.35) continue;
      const x = cx * cellW, y = cy * cellW;
      const fill = pick(rng, [palette[1], palette[2], palette[0]]);
      if (rng() < 0.5) {
        const pad = cellW * rng() * 0.25;
        out += `<rect x="${(x + pad).toFixed(1)}" y="${(y + pad).toFixed(1)}" width="${(cellW - pad * 2).toFixed(1)}" height="${(cellW - pad * 2).toFixed(1)}" fill="${fill}" opacity="${(0.6 + rng() * 0.35).toFixed(2)}" transform="rotate(${intBetween(rng, -8, 8)} ${(x + cellW / 2).toFixed(1)} ${(y + cellW / 2).toFixed(1)})"/>`;
      } else {
        const r = cellW * (0.25 + rng() * 0.2);
        out += `<circle cx="${(x + cellW / 2).toFixed(1)}" cy="${(y + cellW / 2).toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${(0.6 + rng() * 0.35).toFixed(2)}"/>`;
      }
    }
  }
  return out;
}

function waveBands(rng, palette) {
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  const bands = intBetween(rng, 5, 8);
  for (let b = 0; b < bands; b++) {
    const baseY = (SIZE / bands) * b + rng() * 20;
    const amp = 20 + rng() * 50;
    const freq = 1 + rng() * 2.5;
    const phase = rng() * Math.PI * 2;
    let d = `M0,${(baseY + amp).toFixed(1)} `;
    for (let x = 0; x <= SIZE; x += 20) {
      const y = baseY + Math.sin((x / SIZE) * freq * Math.PI * 2 + phase) * amp;
      d += `L${x},${y.toFixed(1)} `;
    }
    d += `L${SIZE},${SIZE} L0,${SIZE} Z`;
    out += `<path d="${d}" fill="${b % 2 === 0 ? palette[1] : palette[2]}" opacity="${(0.45 + rng() * 0.35).toFixed(2)}"/>`;
  }
  return out;
}

function scatterPolygons(rng, palette) {
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  const shapes = intBetween(rng, 14, 24);
  for (let i = 0; i < shapes; i++) {
    const cx = rng() * SIZE, cy = rng() * SIZE;
    const r = 20 + rng() * 90;
    const sides = intBetween(rng, 3, 6);
    const rot = rng() * Math.PI * 2;
    let pts = [];
    for (let s = 0; s < sides; s++) {
      const a = rot + (s / sides) * Math.PI * 2;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    out += `<polygon points="${pts.join(' ')}" fill="${pick(rng, [palette[1], palette[2]])}" opacity="${(0.18 + rng() * 0.3).toFixed(2)}"/>`;
  }
  return out;
}

function orbitDots(rng, palette) {
  let out = `<rect width="${SIZE}" height="${SIZE}" fill="${palette[0]}"/>`;
  const cx = SIZE / 2, cy = SIZE / 2;
  const orbits = intBetween(rng, 5, 9);
  for (let o = 0; o < orbits; o++) {
    const r = (SIZE / 2) * ((o + 1) / orbits) * 0.92;
    out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${palette[1]}" stroke-opacity="0.25" stroke-width="1.5"/>`;
    const dots = intBetween(rng, 1, 4);
    for (let d = 0; d < dots; d++) {
      const a = rng() * Math.PI * 2;
      const dotR = 4 + rng() * 12;
      out += `<circle cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="${dotR.toFixed(1)}" fill="${palette[2]}"/>`;
    }
  }
  return out;
}

const STYLE_FNS = {
  radialBurst, concentricRings, halftoneGrid, geometricBlocks, waveBands, scatterPolygons, orbitDots,
};

function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? current + ' ' + w : w;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function catalogCode(recordSeedBig) {
  const n = Number(recordSeedBig % 1000000n);
  return 'MX-' + String(n).padStart(6, '0');
}

/**
 * Build just the generative background pattern (no text) as an SVG string at SIZE x SIZE.
 * This is the last-resort offline fallback when neither the AI image service nor the stock
 * photo service is reachable. Text/branding is added afterwards by lib/cover/textOverlay.js
 * so every tier (AI art / stock photo / procedural) gets identical, legible typography.
 */
export function buildBackgroundSvg(recordSeedBig) {
  const rng = makeStream(recordSeedBig, 'cover');
  const palette = pick(rng, PALETTES);
  const style = pick(rng, STYLES);
  const background = STYLE_FNS[style](rng, palette);
  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">${background}</svg>`;
}

export { catalogCode, SIZE as PROCEDURAL_SIZE };
