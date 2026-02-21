import config from '../config/index.js';

/* ── DeepSeek is primary; Groq is fallback ── */
const DEEPSEEK_API_KEY = config.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY || '';
const GROQ_API_KEY = config.groq?.apiKey || process.env.GROQ_API_KEY || '';

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const DEEPSEEK_MODEL = 'deepseek-chat';   // DeepSeek-V3 — powerful, cheap
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // fallback

/* ────────────────────────────────────────────
   Tool definitions (OpenAI-compatible format)
   ──────────────────────────────────────────── */
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Search the internet for real-time information, news, facts, or any query that needs fresh data.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall_memory',
      description:
        'Retrieve previously stored information about this user — preferences, facts, or past context.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to recall' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description:
        'Persist a noteworthy fact about this user for future reference.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Short label e.g. "birthday"' },
          value: { type: 'string', description: 'The information to store' },
          category: { type: 'string', description: 'Category: preference, fact, or context' },
        },
        required: ['key', 'value'],
      },
    },
  },
];

/* ────────────────────────────────────────────
   Low-level streaming SSE fetch wrapper
   Converts an OpenAI-compatible SSE stream → async iterator of chunks
   ──────────────────────────────────────────── */


/* ────────────────────────────────────────────
   Public API: createChatStream
   Uses DeepSeek as primary; falls back to Groq on error
   enableTools=false skips tool injection (second pass)
   ──────────────────────────────────────────── */
export async function createChatStream(messages, enableTools = true) {
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature: 0.7,
    ...(enableTools ? { tools: toolDefinitions, tool_choice: 'auto' } : {}),
  };

  // 1. Try DeepSeek (Native Fetch)
  if (DEEPSEEK_API_KEY) {
    try {
      const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, stream: true }),
      });

      if (response.ok) {
        return streamResponse(response);
      }

      const errText = await response.text();
      console.warn('[LLM] DeepSeek response error:', response.status, errText);
    } catch (err) {
      console.warn('[LLM] DeepSeek connection error:', err.message);
    }
  }

  // 2. Fallback to Groq
  if (GROQ_API_KEY) {
    try {
      const response = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, model: GROQ_MODEL, stream: true }),
      });

      if (response.ok) {
        return streamResponse(response);
      }

      const errText = await response.text();
      throw new Error(`Groq error: ${errText}`);
    } catch (err) {
      console.error('[LLM] Critical: All LLM providers failed.', err.message);
      throw err;
    }
  }

  throw new Error('No LLM API keys configured.');
}

/**
 * Shared helper to parse OpenAI-style SSE stream
 */
async function* streamResponse(response) {
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const rawChunk of response.body) {
    buffer += decoder.decode(rawChunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        yield parsed;
      } catch { /* skip */ }
    }
  }
}

/* Second-pass call — no tools so model doesn't force another tool call */
export async function createChatCompletion(messages) {
  return createChatStream(messages, false);
}
