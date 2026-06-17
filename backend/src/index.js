import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// No hardcoded host/port/URLs anywhere: every hosting provider injects its own PORT, and
// binding to 0.0.0.0 (rather than defaulting to localhost) is required for the app to be
// reachable from outside the container on most hosts (Render/Railway/Fly.io/etc.).
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(compression());
app.use(cors({ origin: CORS_ORIGIN }));

app.use('/api', apiRouter);

// In production we serve the built React app from ../client/dist (see client/README).
// In development the frontend runs separately under Vite, which proxies /api to this
// server (see client/vite.config.js) — neither side hardcodes the other's URL/port.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => {
  console.log(`Music store server listening on http://${HOST}:${PORT}`);
});