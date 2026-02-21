import { supabase } from '../services/supabase.js';

/**
 * Authenticate incoming requests using Supabase JWT if present.
 * If no valid token is provided, sets req.user = { id: 'guest' }.
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    req.user = { id: 'guest', email: 'guest@local' };
    return next();
  }

  const token = header.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    req.user = { id: 'guest', email: 'guest@local' };
    return next();
  }

  req.user = data.user;
  req.accessToken = token;
  next();
}
