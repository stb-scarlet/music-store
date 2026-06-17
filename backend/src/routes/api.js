import express from 'express';
import archiver from 'archiver';
import { getLocale, listLocales } from '../locales/index.js';
import { toBigIntSeed, randomSeed64, combinePageSeed, combineRecordSeed } from '../rng/seed.js';
import { generateSongContent, generateLikes, generateReviews, generateLabelAndYear } from '../lib/songGenerator.js';
import { generateLyrics } from '../lib/lyricsGenerator.js';
import { generateSongAudio, composeForRecord } from '../lib/musicGenerator.js';
import { getCoverImage } from '../lib/cover/index.js';
import { wavToMp3 } from '../lib/music/mp3.js';
import { encodeToken, decodeToken } from '../lib/token.js';

const router = express.Router();

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampFloat(value, min, max, fallback) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeFilenamePart(str) {
  return String(str).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60) || 'untitled';
}

router.get('/locales', (req, res) => {
  res.json(listLocales());
});

router.get('/random-seed', (req, res) => {
  res.json({ seed: randomSeed64().toString() });
});

router.get('/songs', (req, res) => {
  try {
    const locale = getLocale(req.query.region || 'en-US');
    const seedBig = toBigIntSeed(req.query.seed ?? '0');
    const page = clampInt(req.query.page, 1, 1_000_000_000, 1);
    const pageSize = clampInt(req.query.pageSize, 1, 100, 20);
    const avgLikes = clampFloat(req.query.likes, 0, 10, 0);

    const pageSeed = combinePageSeed(seedBig, page);
    const items = [];
    for (let i = 0; i < pageSize; i++) {
      const recordSeed = combineRecordSeed(pageSeed, i);
      const content = generateSongContent(locale, recordSeed);
      const likes = generateLikes(recordSeed, avgLikes);
      items.push({
        sequenceIndex: (page - 1) * pageSize + i + 1,
        token: encodeToken(locale.code, recordSeed),
        title: content.title,
        artist: content.artist,
        album: content.album,
        isSingle: content.isSingle,
        genre: content.genre,
        likes,
      });
    }
    res.json({ page, pageSize, region: locale.code, items });
  } catch (err) {
    res.status(400).json({ error: 'bad_request', message: err.message });
  }
});

router.get('/song-detail/:token', (req, res) => {
  try {
    const { region, recordSeedBig } = decodeToken(req.params.token);
    console.log("1");
    const locale = getLocale(region);
    console.log("2");
    const content = generateSongContent(locale, recordSeedBig);
    const avgLikes = clampFloat(req.query.likes, 0, 10, 0);
    console.log("3");
    const likes = generateLikes(recordSeedBig, avgLikes);
    console.log("4");
    const reviews = generateReviews(locale, recordSeedBig);
    console.log("5");
    const { label, year } = generateLabelAndYear(recordSeedBig);
    console.log("6");
    const composition = composeForRecord(recordSeedBig);
    console.log("7");
    const lyrics = generateLyrics(locale, recordSeedBig, composition);

    res.json({
      title: content.title,
      artist: content.artist,
      album: content.album,
      isSingle: content.isSingle,
      genre: content.genre,
      label,
      year,
      likes,
      reviews,
      lyrics,
      tempoBpm: composition.tempoBpm,
      coverUrl: `/api/cover/${req.params.token}`,
      audioUrl: `/api/audio/${req.params.token}`,
    });
  } catch (err) {
    res.status(400).json({ error: 'bad_request', message: err.message });
  }
});

router.get('/cover/:token', async (req, res) => {
  try {
    const { region, recordSeedBig } = decodeToken(req.params.token);
    const locale = getLocale(region);
    const content = generateSongContent(locale, recordSeedBig);
    const size = clampInt(req.query.size, 128, 1024, 640);
    const { buffer, contentType } = await getCoverImage(recordSeedBig, content, { size });
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: 'bad_request', message: err.message });
  }
});

router.get('/audio/:token', (req, res) => {
  try {
    const { recordSeedBig } = decodeToken(req.params.token);
    const { wav } = generateSongAudio(recordSeedBig);
    res.set('Content-Type', 'audio/wav');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(wav);
  } catch (err) {
    res.status(400).json({ error: 'bad_request', message: err.message });
  }
});

// Optional requirement: export a batch of songs as a ZIP of MP3 files, named after
// artist/title/album. Exports the requested page (capped, since each song needs real
// synthesis + MP3 encoding work).
router.get('/export', async (req, res) => {
  try {
    const locale = getLocale(req.query.region || 'en-US');
    const seedBig = toBigIntSeed(req.query.seed ?? '0');
    const page = clampInt(req.query.page, 1, 1_000_000_000, 1);
    const pageSize = clampInt(req.query.pageSize, 1, 30, 20);

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="songs-page-${page}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      if (!res.headersSent) res.status(500);
      res.end();
      console.error('Export archive error:', err);
    });
    archive.pipe(res);

    const pageSeed = combinePageSeed(seedBig, page);
    for (let i = 0; i < pageSize; i++) {
      const recordSeed = combineRecordSeed(pageSeed, i);
      const content = generateSongContent(locale, recordSeed);
      const { wav } = generateSongAudio(recordSeed);
      const mp3 = wavToMp3(wav);
      const filename = `${sanitizeFilenamePart(content.artist)} - ${sanitizeFilenamePart(content.title)} (${sanitizeFilenamePart(content.album)}).mp3`;
      archive.append(mp3, { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) res.status(400).json({ error: 'bad_request', message: err.message });
    else res.end();
  }
});

export default router;