import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/auth/me
 * Returns the current user's profile from the token.
 */
router.get('/me', optionalAuth, (req, res) => {
  const { id, email, user_metadata } = req.user;
  res.json({
    id,
    email,
    name: user_metadata?.full_name || user_metadata?.name || email.split('@')[0],
    avatar: user_metadata?.avatar_url || null,
  });
});

export default router;
