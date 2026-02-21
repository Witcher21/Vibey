import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './src/config/index.js';
import { apiLimiter } from './src/middleware/rateLimiter.js';
import chatRoutes from './src/routes/chat.js';
import authRoutes from './src/routes/auth.js';

const app = express();

/* ─── Global middleware ───────────────────────────── */
app.use(helmet());
app.use(morgan('short'));
app.use(
  cors({
    origin: [config.cors.frontendUrl, 'http://localhost:9000', 'http://localhost:3000'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* ─── Rate limiting on API routes ─────────────────── */
app.use('/api/', apiLimiter);

/* ─── Routes ──────────────────────────────────────── */
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

/* ─── Health check ────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ─── Root Route ──────────────────────────────────── */
app.get('/', (_req, res) => {
  res.send('🚀 Vibey AI Backend is running successfully! (This is just the API. The UI is hosted on Vercel.)');
});

/* ─── 404 fallback ────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

/* ─── Global error handler ────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: config.nodeEnv === 'production' ? 'Internal server error.' : err.message,
  });
});

/* ─── Start ───────────────────────────────────────── */
app.listen(config.port, () => {
  console.log(`\n🚀 Vibey API running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}\n`);
});

export default app;
