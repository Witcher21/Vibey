import { defineStore } from 'pinia';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useChatStore = defineStore('chat', {
  state: () => {
    // Load from local storage and clean up any stuck streaming states
    const saved = JSON.parse(localStorage.getItem('vibey_chat')) || [];
    saved.forEach((msg) => { msg.isStreaming = false; });

    return {
      messages: saved,
      isStreaming: false,
      statusMessage: '',
      error: null,
    };
  },

  getters: {
    messageCount: (state) => state.messages.length,
  },

  /* Helper to persist to localStorage */
  _saveChat() {
    localStorage.setItem('vibey_chat', JSON.stringify(this.messages));
  },

  /* Helper to sanitize ugly API error dumps */
  _cleanError(msg) {
    if (!msg) return 'An unknown error occurred.';
    let clean = typeof msg === 'string' ? msg : JSON.stringify(msg);
    // Strip giant Google JSON arrays if they are present
    const idx = clean.indexOf('[{');
    if (idx > -1) {
      clean = clean.substring(0, idx).trim();
    }
    return clean;
  },

  actions: {
    /* ─── Send a message and stream the response ─── */
    async sendMessage(text, file = null) {
      this.error = null;

      /* Optimistic UI — add user message immediately */
      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        file: file ? { name: file.name, size: file.size } : null,
      };
      this.messages.push(userMsg);

      /* Placeholder for assistant response */
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        musicResults: null,
        isStreaming: true,
      };
      this.messages.push(assistantMsg);
      this._saveChat();
      this.isStreaming = true;
      this.statusMessage = '';

      try {
        /* Build multipart form */
        const form = new FormData();
        form.append('message', text);
        if (file) form.append('file', file);

        // Pass the last 10 messages (excluding the new one just added to the end) to preserve context for guests
        const localHistory = this.messages
          .filter(m => m.id !== userMsg.id && m.id !== assistantMsg.id && m.content)
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content }));
        form.append('history', JSON.stringify(localHistory));

        const headers = {};
        /* If user has a Supabase session, attach the token */
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

        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers,
          body: form,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${response.status}`);
        }

        /* ─── Parse SSE stream ─── */
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
                this._handleSSEEventWithType(currentEvent, payload, assistantMsg.id);
              } catch { /* non-JSON line, skip */ }
            }
          }
        }

        /* Process any remaining buffer */
        if (buffer.trim()) {
          const remaining = buffer.split('\n');
          let currentEvent = null;
          for (const line of remaining) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                this._handleSSEEventWithType(currentEvent, payload, assistantMsg.id);
              } catch { /* non-JSON line, skip */ }
            }
          }
        }
      } catch (err) {
        const cleanErr = this._cleanError(err.message);
        this.error = cleanErr;
        if (assistantMsg.content.length === 0) {
           assistantMsg.content = `⚠️ **System Info:** ${cleanErr}`;
        } else {
           assistantMsg.content += `\n\n⚠️ **System Info:** ${cleanErr}`;
        }
      } finally {
        const reactiveMsg = this.messages.find((m) => m.id === assistantMsg.id);
        if (reactiveMsg) {
          reactiveMsg.isStreaming = false;
        }
        this._saveChat();
        this.isStreaming = false;
        this.statusMessage = '';
      }
    },

    _handleSSEEventWithType(type, payload, msgId) {
      const msg = this.messages.find((m) => m.id === msgId);
      if (!msg) return;

      switch (type) {
        case 'token':
          msg.content += payload.content || '';
          break;
        case 'status':
          this.statusMessage = payload.message || '';
          break;
        case 'error':
          {
            const cleanErr = this._cleanError(payload.message);
            this.error = cleanErr;
            if (msg.content.length === 0) {
              msg.content = `⚠️ **System Info:** ${cleanErr}`;
            } else {
              msg.content += `\n\n⚠️ **System Info:** ${cleanErr}`;
            }
          }
          break;
        case 'done':
          break;
        default:
          /* Fallback: handle events without explicit type */
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

    /* ─── Clear chat (local only) ─── */
    clearChat() {
      this.messages = [];
      this._saveChat();
    },
  },
});
