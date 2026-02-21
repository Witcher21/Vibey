import { createChatStream, createChatCompletion } from './services/llm.js';
import { searchWeb } from './services/webSearch.js';
import { saveMemory, recallMemory, saveChatMessage, getChatHistory } from './services/memory.js';
import { extractFileContent } from './services/fileProcessor.js';

const SYSTEM_PROMPT = `You are **Vibey**, a highly capable AI assistant. You are friendly, concise, and helpful.

Capabilities:
• You can search the web for real-time information using the web_search tool.
• You can remember facts about the user using save_memory and recall them later with recall_memory.
• You can read and analyze files the user uploads (PDF, text, code, CSV, etc.).

Guidelines:
• Use tools proactively when the user's query would benefit from fresh information.
• When the user shares personal preferences or facts, save them to memory without being asked.
• Always provide well-formatted responses using Markdown where helpful.
• Be conversational and natural — not robotic.`;

/* ────────────────────────────────────────────
   Tool executor map
   ──────────────────────────────────────────── */
const toolExecutors = {
  web_search: async (args) => {
    const results = await searchWeb(args.query);
    return JSON.stringify(results);
  },

  recall_memory: async (args, userId) => {
    const result = await recallMemory(userId, args.query);
    return JSON.stringify(result);
  },

  save_memory: async (args, userId) => {
    const result = await saveMemory(userId, args.key, args.value, args.category || 'general');
    return JSON.stringify(result);
  },
};

/* ────────────────────────────────────────────
   Main agent handler — SSE streaming
   ──────────────────────────────────────────── */

/**
 * @param {object} options
 * @param {string} options.userId
 * @param {string} options.userMessage
 * @param {object} options.res        — Express response (SSE)
 * @param {object|null} options.file  — { buffer, mimetype, originalname }
 * @param {Array|null} options.localHistory — UI history for guests
 */
export async function runAgent({ userId, userMessage, res, file, localHistory }) {
  /* ── 1. Prepare SSE headers ── */
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    /* ── 2. Build message context ── */
    let history = [];
    if (userId === 'guest' && localHistory && Array.isArray(localHistory)) {
      history = localHistory;
    } else {
      history = await getChatHistory(userId, 20);
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role, content: h.content })),
    ];

    /* ── 3. Handle file upload ── */
    let fileContext = '';
    if (file) {
      sendEvent('status', { message: 'Processing uploaded file…' });
      const extracted = await extractFileContent(file.buffer, file.mimetype, file.originalname);
      fileContext = `\n\n---\n📎 **Uploaded file:** \`${extracted.filename}\` (${extracted.pages} page${extracted.pages > 1 ? 's' : ''})\n\n\`\`\`\n${extracted.text.slice(0, 12000)}\n\`\`\`\n---\n`;
    }

    const fullUserMessage = fileContext
      ? `${userMessage}\n${fileContext}`
      : userMessage;

    messages.push({ role: 'user', content: fullUserMessage });

    /* ── 4. Save user message to history ── */
    await saveChatMessage(userId, 'user', userMessage);

    /* ── 5. First LLM call (may invoke tools) ── */
    sendEvent('status', { message: 'Thinking…' });

    let stream = await createChatStream(messages);
    let assistantContent = '';
    let toolCalls = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      // Accumulate text content
      if (delta?.content) {
        assistantContent += delta.content;
        sendEvent('token', { content: delta.content });
      }

      // Accumulate tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index !== undefined) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = {
                id: tc.id || '',
                type: 'function',
                function: { name: '', arguments: '' },
              };
            }
            if (tc.id) toolCalls[tc.index].id = tc.id;
            if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
            if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
          }
        }
      }

      if (finishReason === 'tool_calls') {
        // Process tool calls
        break;
      }
    }

    /* ── 6. Execute tool calls if any ── */
    if (toolCalls.length > 0) {
      // Add the assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments || '{}');

        sendEvent('status', { message: `Using ${fnName.replace('_', ' ')}…` });

        const executor = toolExecutors[fnName];
        let result = '{"error": "Unknown tool"}';

        if (executor) {
          try {
            result = await executor(fnArgs, userId);
          } catch (err) {
            console.error(`[Agent] Tool ${fnName} error:`, err.message);
            result = JSON.stringify({ error: err.message });
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      /* ── 7. Second LLM call — synthesize final answer ── */
      sendEvent('status', { message: 'Composing response…' });

      const followUp = await createChatCompletion(messages);
      assistantContent = '';

      for await (const chunk of followUp) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          assistantContent += delta.content;
          sendEvent('token', { content: delta.content });
        }
      }
    }

    /* ── 8. Save assistant response to history ── */
    if (assistantContent) {
      await saveChatMessage(userId, 'assistant', assistantContent);
    }

    sendEvent('done', { message: 'complete' });
  } catch (err) {
    console.error('[Agent] Fatal error:', err);
    sendEvent('error', { message: err.message || 'An unexpected error occurred.' });
  } finally {
    res.end();
  }
}
