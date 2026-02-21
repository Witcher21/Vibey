import { defineStore } from 'pinia';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STORAGE_KEY = 'vibey_sessions';

function generateId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createSession() {
  return {
    id: generateId(),
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Clean up stuck streaming states
        parsed.forEach((s) => {
          if (s && Array.isArray(s.messages)) {
            s.messages.forEach((m) => {
              if (m) m.isStreaming = false;
            });
          }
        });
        return parsed;
      }
    }
  } catch (e) {
    console.error('[ChatStore] LocalStorage parse fail:', e);
  }
  return [createSession()];
}

export const useChatStore = defineStore('chat', {
  state: () => {
    const sessions = loadSessions();
    const activeId = sessions[0]?.id || '';

    return {
      sessions,
      activeSessionId: activeId,
      isStreaming: false,
      statusMessage: '',
      error: null,
    };
  },

  getters: {
    /** Current active session object */
    activeSession: (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId) || state.sessions[0],

    /** Messages of the active session */
    messages() {
      return this.activeSession?.messages || [];
    },

    /** Message count of active session */
    messageCount() {
      return this.messages.length;
    },

    /** All sessions sorted by most recent first */
    sortedSessions: (state) =>
      [...state.sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
  },

  actions: {
    /* ═══ Internal helpers ═══ */
    _persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
    },

    _cleanError(msg) {
      if (!msg) return 'An unknown error occurred.';
      let clean = typeof msg === 'string' ? msg : JSON.stringify(msg);
      const idx = clean.indexOf('[{');
      if (idx > -1) clean = clean.substring(0, idx).trim();
      return clean;
    },

    _autoTitle(text) {
      if (!text) return 'New Chat';
      const cleaned = text.replace(/\s+/g, ' ').trim();
      return cleaned.length > 38 ? cleaned.slice(0, 38) + '…' : cleaned;
    },

    /* ═══ Session Management ═══ */

    /** Create a new chat session and switch to it */
    newChat() {
      const session = createSession();
      this.sessions.unshift(session);
      this.activeSessionId = session.id;
      this._persist();
    },

    /** Switch to an existing session */
    switchSession(sessionId) {
      if (this.sessions.find((s) => s.id === sessionId)) {
        this.activeSessionId = sessionId;
      }
    },

    /** Delete a session */
    deleteSession(sessionId) {
      this.sessions = this.sessions.filter((s) => s.id !== sessionId);
      // If we deleted the active session, switch to first or create new
      if (this.activeSessionId === sessionId) {
        if (this.sessions.length === 0) {
          this.newChat();
        } else {
          this.activeSessionId = this.sessions[0].id;
        }
      }
      this._persist();
    },

    /** Clear current chat (keeps the session, just empties messages) */
    clearChat() {
      this.newChat();
    },

    /* ═══ Send message & stream response ═══ */
    async sendMessage(text, file = null) {
      this.error = null;
      const session = this.activeSession;
      if (!session) return;

      /* Optimistic UI — add user message immediately */
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        file: file ? { name: file.name, size: file.size } : null,
      };
      session.messages.push(userMsg);

      /* Auto-title from first user message */
      if (session.messages.filter((m) => m.role === 'user').length === 1) {
        session.title = this._autoTitle(text);
      }
      session.updatedAt = new Date().toISOString();

      /* Placeholder for assistant response */
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      session.messages.push(assistantMsg);
      this._persist();
      this.isStreaming = true;
      this.statusMessage = '';

      try {
        const form = new FormData();
        form.append('message', text);
        if (file) form.append('file', file);

        // Pass last 10 messages as context
        const localHistory = session.messages
          .filter((m) => m && m.id !== userMsg.id && m.id !== assistantMsg.id && m.content)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));
        form.append('history', JSON.stringify(localHistory));

        const headers = {};
        try {
          const { supabase } = await import('src/boot/supabase');
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) {
              headers['Authorization'] = `Bearer ${data.session.access_token}`;
            }
          }
        } catch {
          /* No auth — guest mode */
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000); // 90s timeout

        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers,
          body: form,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${response.status}`);
        }

        /* Parse SSE stream */
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
              continue;
            }
            if (line.startsWith('data: ')) {
              const raw = line.slice(6);
              try {
                const payload = JSON.parse(raw);
                this._handleSSE(currentEvent, payload, assistantMsg.id, session.id);
              } catch {
                /* non-JSON line, skip */
              }
            }
          }
        }

        /* Process remaining buffer */
        if (buffer.trim()) {
          const remaining = buffer.split('\n');
          let currentEvent = null;
          for (const line of remaining) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                this._handleSSE(currentEvent, payload, assistantMsg.id, session.id);
              } catch {
                /* skip */
              }
            }
          }
        }
      } catch (err) {
        const isTimeout = err.name === 'AbortError';
        const cleanErr = isTimeout
          ? 'Response timed out. The AI server may be busy — please try again.'
          : this._cleanError(err.message);
        this.error = cleanErr;
        const msg = session.messages.find((m) => m.id === assistantMsg.id);
        if (msg) {
          if (msg.content.length === 0) {
            msg.content = `⚠️ **Error:** ${cleanErr}`;
          } else {
            msg.content += `\n\n⚠️ **Error:** ${cleanErr}`;
          }
        }
      } finally {
        const msg = session.messages.find((m) => m.id === assistantMsg.id);
        if (msg) msg.isStreaming = false;
        session.updatedAt = new Date().toISOString();
        this._persist();
        this.isStreaming = false;
        this.statusMessage = '';
      }
    },

    _handleSSE(type, payload, msgId, sessionId) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const msg = session.messages.find((m) => m.id === msgId);
      if (!msg) return;

      switch (type) {
        case 'token':
          msg.content += payload.content || '';
          break;
        case 'status':
          this.statusMessage = payload.message || '';
          break;
        case 'error': {
          const cleanErr = this._cleanError(payload.message);
          this.error = cleanErr;
          if (msg.content.length === 0) {
            msg.content = `⚠️ **Error:** ${cleanErr}`;
          } else {
            msg.content += `\n\n⚠️ **Error:** ${cleanErr}`;
          }
          break;
        }
        case 'done':
          break;
        default:
          if (payload.content !== undefined) {
            msg.content += payload.content;
          }
          if (payload.message && !payload.content) {
            if (payload.message !== 'complete') {
              this.statusMessage = payload.message;
            }
          }
          break;
      }
    },
  },
});
