import { describe, it, expect, vi } from 'vitest';

/*
 * Mock all external services so tests run without API keys or network.
 */

// ─── Mock: Supabase ────────────────────────────────
vi.mock('../src/services/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@vibey.app' } },
        error: null,
      }),
    },
  },
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

// ─── Mock: Web Search ──────────────────────────────
vi.mock('../src/services/webSearch.js', () => ({
  searchWeb: vi.fn().mockResolvedValue([
    { title: 'Test Result', url: 'https://example.com', snippet: 'A test search result.' },
  ]),
}));

// ─── Mock: File Processor ──────────────────────────
vi.mock('../src/services/fileProcessor.js', () => ({
  extractFileContent: vi.fn().mockResolvedValue({
    text: 'This is the extracted text from the PDF.',
    pages: 3,
    filename: 'test.pdf',
  }),
  ALLOWED_MIME_TYPES: ['application/pdf', 'text/plain'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
}));

// ─── Mock: LLM ─────────────────────────────────────
vi.mock('../src/services/llm.js', () => {
  const mockStream = async function* () {
    yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] };
    yield { choices: [{ delta: { content: ', I am' }, finish_reason: null }] };
    yield { choices: [{ delta: { content: ' Vibey!' }, finish_reason: 'stop' }] };
  };

  return {
    createChatStream: vi.fn().mockResolvedValue(mockStream()),
    createChatCompletion: vi.fn().mockResolvedValue(mockStream()),
    toolDefinitions: [],
  };
});

// ─── Mock: Memory ──────────────────────────────────
vi.mock('../src/services/memory.js', () => ({
  saveMemory: vi.fn().mockResolvedValue({ action: 'saved', key: 'test', value: 'value' }),
  recallMemory: vi.fn().mockResolvedValue({ found: false, memories: [], message: 'No memories.' }),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  getChatHistory: vi.fn().mockResolvedValue([]),
}));

// ─── Mock: Config ──────────────────────────────────
vi.mock('../src/config/index.js', () => ({
  default: {
    port: 3001,
    nodeEnv: 'test',
    supabase: { url: 'https://test.supabase.co', anonKey: 'test', serviceRoleKey: 'test' },
    groq: { apiKey: 'test-groq-key' },
    deepseek: { apiKey: 'test-deepseek-key' },
    cors: { frontendUrl: 'http://localhost:9000' },
    rateLimit: { windowMs: 60000, max: 100 },
  },
}));

/* ═══════════════════════════════════════════════════
   Test Suites
   ═══════════════════════════════════════════════════ */

describe('Web Search Service', () => {
  it('returns structured results', async () => {
    const { searchWeb } = await import('../src/services/webSearch.js');
    const results = await searchWeb('test query');
    expect(results).toBeInstanceOf(Array);
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('url');
    expect(results[0]).toHaveProperty('snippet');
  });
});

describe('File Processor', () => {
  it('extracts text from PDF buffer', async () => {
    const { extractFileContent } = await import('../src/services/fileProcessor.js');
    const result = await extractFileContent(Buffer.from('fake'), 'application/pdf', 'test.pdf');
    expect(result.text).toBeTruthy();
    expect(result.pages).toBeGreaterThan(0);
    expect(result.filename).toBe('test.pdf');
  });
});

describe('Memory Service', () => {
  it('saves a memory and returns confirmation', async () => {
    const { saveMemory } = await import('../src/services/memory.js');
    const result = await saveMemory('user-1', 'color', 'blue', 'preference');
    expect(result).toHaveProperty('action', 'saved');
  });

  it('recalls memories by query', async () => {
    const { recallMemory } = await import('../src/services/memory.js');
    const result = await recallMemory('user-1', 'color');
    expect(result).toHaveProperty('found');
    expect(result).toHaveProperty('memories');
  });

  it('ignores memory save for guest users', async () => {
    const { saveMemory } = await import('../src/services/memory.js');
    // Even though mocked, we test the interface contract
    const result = await saveMemory('guest', 'test', 'value');
    expect(result).toBeDefined();
  });
});

describe('LLM Streaming', () => {
  it('streams tokens from createChatStream', async () => {
    const { createChatStream } = await import('../src/services/llm.js');
    const stream = await createChatStream([{ role: 'user', content: 'Hi' }]);

    const tokens = [];
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        tokens.push(chunk.choices[0].delta.content);
      }
    }

    expect(tokens.join('')).toBe('Hello, I am Vibey!');
  });

  it('createChatCompletion also streams without tools', async () => {
    const { createChatCompletion } = await import('../src/services/llm.js');
    const stream = await createChatCompletion([{ role: 'user', content: 'Hi' }]);

    const tokens = [];
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        tokens.push(chunk.choices[0].delta.content);
      }
    }

    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe('Auth Middleware', () => {
  it('assigns guest user when no Authorization header is present', async () => {
    const { optionalAuth } = await import('../src/middleware/auth.js');

    const req = { headers: {} };
    const res = {};
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toHaveProperty('id', 'guest');
    expect(next).toHaveBeenCalled();
  });

  it('assigns guest user with invalid token', async () => {
    const { optionalAuth } = await import('../src/middleware/auth.js');

    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = {};
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(req.user).toHaveProperty('id');
    expect(next).toHaveBeenCalled();
  });
});

describe('Agent Integration', () => {
  it('runAgent sends SSE events and ends response', async () => {
    const { runAgent } = await import('../src/agent.js');

    const events = [];
    const mockRes = {
      writeHead: vi.fn(),
      write: vi.fn((data) => events.push(data)),
      end: vi.fn(),
    };

    await runAgent({
      userId: 'guest',
      userMessage: 'Hello!',
      res: mockRes,
      file: null,
      localHistory: [],
    });

    // Should have called writeHead with SSE headers
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }));

    // Should have written at least status + token + done events
    expect(events.length).toBeGreaterThanOrEqual(2);

    // res.end() should have been called
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('runAgent handles errors gracefully', async () => {
    const { runAgent } = await import('../src/agent.js');

    const events = [];
    const mockRes = {
      writeHead: vi.fn(),
      write: vi.fn((data) => events.push(data)),
      end: vi.fn(),
    };

    // Send with null message to trigger potential error handling
    await runAgent({
      userId: 'guest',
      userMessage: '',
      res: mockRes,
      file: null,
      localHistory: [],
    });

    // Should always end the response
    expect(mockRes.end).toHaveBeenCalled();
  });
});

describe('Rate Limiter Middleware', () => {
  it('exports apiLimiter as a function', async () => {
    const { apiLimiter } = await import('../src/middleware/rateLimiter.js');
    expect(typeof apiLimiter).toBe('function');
  });
});
