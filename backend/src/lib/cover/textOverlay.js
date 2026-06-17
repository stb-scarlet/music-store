function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

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

export function catalogCode(recordSeedBig) {
  const n = Number(recordSeedBig % 1000000n);
  return 'MX-' + String(n).padStart(6, '0');
}

/** Build an SVG overlay (transparent except for the text/panel) at `size` x `size`. */
export function buildTextOverlaySvg(size, { title, artist }, code) {
  const titleSize = title.length > 22 ? size * 0.053 : title.length > 14 ? size * 0.0625 : size * 0.075;
  const titleLines = wrapText(title, title.length > 22 ? 18 : 24);
  const lineHeight = titleSize * 1.12;
  const blockHeight = titleLines.length * lineHeight;
  const margin = size * 0.0625;
  const titleStartY = size - size * 0.125 - blockHeight;
  const panelY = titleStartY - lineHeight * 1.5;

  const titleTspans = titleLines
    .map((line, i) => `<tspan x="${margin}" y="${(titleStartY + i * lineHeight).toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('');

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.64"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${panelY.toFixed(1)}" width="${size}" height="${(size - panelY).toFixed(1)}" fill="url(#panel)"/>
    <rect x="${size * 0.01}" y="${size * 0.01}" width="${size * 0.98}" height="${size * 0.98}" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="${size * 0.003}"/>
    <text x="${size - margin * 0.5}" y="${size * 0.047}" text-anchor="end" font-family="'Courier New', monospace" font-size="${size * 0.02}" letter-spacing="1" fill="#ffffff" fill-opacity="0.55">${escapeXml(code)}</text>
    <text x="${margin}" y="${(titleStartY - lineHeight * 0.55).toFixed(1)}" font-family="Helvetica, Arial, sans-serif" font-size="${size * 0.0235}" letter-spacing="3" fill="#ffffff" fill-opacity="0.88">${escapeXml(artist.toUpperCase())}</text>
    <text font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${titleSize.toFixed(1)}" fill="#ffffff">${titleTspans}</text>
  </svg>`;
}