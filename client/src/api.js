const BASE = import.meta.env.VITE_API_URL || '/api';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function fetchLocales() {
  return getJson(`${BASE}/locales`);
}

export function fetchRandomSeed() {
  return getJson(`${BASE}/random-seed`);
}

export function fetchSongs({ seed, region, likes, page, pageSize }) {
  const params = new URLSearchParams({ seed, region, likes, page, pageSize });
  return getJson(`${BASE}/songs?${params.toString()}`);
}

export function fetchSongDetail(token, likes) {
  const params = new URLSearchParams({ likes });
  return getJson(`${BASE}/song-detail/${encodeURIComponent(token)}?${params.toString()}`);
}

export function coverUrl(token, size = 480) {
  return `${BASE}/cover/${encodeURIComponent(token)}?size=${size}`;
}

export function audioUrl(token) {
  return `${BASE}/audio/${encodeURIComponent(token)}`;
}

export function exportUrl({ seed, region, page, pageSize }) {
  const params = new URLSearchParams({ seed, region, page, pageSize });
  return `${BASE}/export?${params.toString()}`;
}