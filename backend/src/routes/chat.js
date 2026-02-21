import { Router } from 'express';
import multer from 'multer';
import { optionalAuth } from '../middleware/auth.js';
import { runAgent } from '../agent.js';
import { getChatHistory } from '../services/memory.js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../services/fileProcessor.js';

const router = Router();

/* ─── Multer: in-memory file storage ──────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/* ─── POST /api/chat — SSE streaming response ─────── */
router.post(
  '/',
  optionalAuth,
  upload.single('file'),
  async (req, res) => {
    const userMessage = req.body?.message;

    if (!userMessage && !req.file) {
      return res.status(400).json({ error: 'Message or file is required.' });
    }

    await runAgent({
      userId: req.user.id,
      userMessage: userMessage || 'Please analyze this file.',
      res,
      file: req.file
        ? {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname,
          }
        : null,
      localHistory: req.body?.history ? JSON.parse(req.body.history) : null,
    });
  },
);

/* ─── GET /api/chat/history ───────────────────────── */
router.get('/history', optionalAuth, async (req, res) => {
  if (req.user.id === 'guest') {
    return res.json({ history: [] });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const history = await getChatHistory(req.user.id, limit);
    res.json({ history });
  } catch (err) {
    console.error('[Chat] History error:', err.message);
    res.status(500).json({ error: 'Failed to load chat history.' });
  }
});

/* ─── DELETE /api/chat/history — clear all history ── */
router.delete('/history', optionalAuth, async (req, res) => {
  if (req.user.id === 'guest') {
    return res.json({ message: 'Guest chat history cleared locally.' });
  }
  try {
    const { supabaseAdmin } = await import('../services/supabase.js');
    await supabaseAdmin.from('chat_history').delete().eq('user_id', req.user.id);
    res.json({ message: 'Chat history cleared.' });
  } catch (err) {
    console.error('[Chat] Clear history error:', err.message);
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

export default router;
