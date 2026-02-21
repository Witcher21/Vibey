import { supabaseAdmin } from './supabase.js';

const TABLE = 'long_term_memory';

/**
 * Save a memory entry for a user.
 */
export async function saveMemory(userId, key, value, category = 'general') {
  if (userId === 'guest') {
    return { action: 'ignored', key, value, message: 'Memory not saved in guest mode.' };
  }

  // Upsert: update if key exists, insert otherwise
  const { data: existing } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ value, category, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    return { action: 'updated', key, value };
  }

  const { error } = await supabaseAdmin.from(TABLE).insert({
    user_id: userId,
    key,
    value,
    category,
  });
  if (error) throw error;
  return { action: 'saved', key, value };
}

/**
 * Recall memories that match a query (case-insensitive search across key + value).
 */
export async function recallMemory(userId, query) {
  if (userId === 'guest') {
    return { found: false, memories: [], message: 'Memory recall disabled in guest mode.' };
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('key, value, category, updated_at')
    .eq('user_id', userId)
    .or(`key.ilike.%${query}%,value.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  if (!data || data.length === 0) {
    return { found: false, memories: [], message: 'No matching memories found for this user.' };
  }

  return {
    found: true,
    memories: data,
    message: data.map((m) => `• **${m.key}**: ${m.value}`).join('\n'),
  };
}

/**
 * Persist a chat message to history.
 */
export async function saveChatMessage(userId, role, content, metadata = {}) {
  if (userId === 'guest') return;
  const { error } = await supabaseAdmin.from('chat_history').insert({
    user_id: userId,
    role,
    content,
    metadata,
  });
  if (error) console.error('[Memory] saveChatMessage error:', error.message);
}

/**
 * Retrieve recent chat history for context.
 */
export async function getChatHistory(userId, limit = 20) {
  if (userId === 'guest') return [];

  const { data, error } = await supabaseAdmin
    .from('chat_history')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Memory] getChatHistory error:', error.message);
    return [];
  }

  return (data || []).reverse();
}
