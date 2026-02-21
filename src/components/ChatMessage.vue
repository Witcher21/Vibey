<template>
  <div class="message-row" :class="message.role">
    <!-- Avatar -->
    <div class="msg-avatar">
      <template v-if="message.role === 'assistant'">
        <div class="avatar-ai">
          <q-icon name="auto_awesome" size="18px" />
        </div>
      </template>
      <template v-else>
        <div class="avatar-user">
          {{ initials }}
        </div>
      </template>
    </div>

    <!-- Content -->
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-author">{{ message.role === 'assistant' ? 'Vibey' : userName }}</span>
      </div>

      <!-- File attachment badge -->
      <div v-if="message.file" class="msg-file-badge">
        <q-icon name="description" size="14px" />
        <span>{{ message.file.name }}</span>
      </div>

      <!-- Rendered markdown content -->
      <div
        v-if="message.content"
        class="msg-content"
        v-html="renderedContent"
      ></div>

      <!-- Typing cursor for streaming -->
      <span v-if="message.isStreaming" class="typing-cursor"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps({
  message: { type: Object, required: true },
  userName: { type: String, default: 'User' },
});

const initials = computed(() => {
  return props.userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
});

/* ─── Markdown rendering with syntax highlighting ─── */
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderedContent = computed(() => {
  if (!props.message.content) return '';
  try {
    return marked.parse(props.message.content);
  } catch {
    return props.message.content;
  }
});
</script>

<style lang="scss" scoped>
.message-row {
  display: flex;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.03);
  margin-bottom: 24px;
  animation: msg-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: all 0.3s ease;

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  &.user {
    background: rgba(139, 92, 246, 0.04);
    border: 1px solid rgba(139, 92, 246, 0.1);
  }

  &.assistant {
    background: rgba(6, 182, 212, 0.02);
    border: 1px solid rgba(6, 182, 212, 0.08);
  }
}

@keyframes msg-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Avatars ─── */
.msg-avatar { flex-shrink: 0; padding-top: 2px; }
.avatar-ai {
  width: 38px; height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
}
.avatar-user {
  width: 38px; height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d8b4fe;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

/* ─── Body ─── */
.msg-body { flex: 1; min-width: 0; }
.msg-header {
  margin-bottom: 4px;
}
.msg-author {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.2px;
}

.msg-file-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  font-size: 12px;
  color: #c4b5fd;
  margin-bottom: 8px;
}

/* ─── Content (Markdown) ─── */
.msg-content {
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  word-wrap: break-word;

  :deep(p) {
    margin: 0 0 12px;
    &:last-child { margin-bottom: 0; }
  }

  :deep(h1), :deep(h2), :deep(h3) {
    color: #fff;
    margin: 16px 0 8px;
    font-weight: 600;
  }

  :deep(ul), :deep(ol) {
    padding-left: 20px;
    margin: 8px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(a) {
    color: #8b5cf6;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  :deep(code) {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: #e2e8f0;
  }

  :deep(pre) {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 16px;
    overflow-x: auto;
    margin: 12px 0;

    code {
      background: transparent;
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  :deep(blockquote) {
    border-left: 3px solid #7c3aed;
    padding-left: 14px;
    margin: 12px 0;
    color: rgba(255, 255, 255, 0.6);
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 14px;

    th, td {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: rgba(255, 255, 255, 0.05);
      font-weight: 600;
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 16px 0;
  }

  :deep(strong) { color: #fff; }
  :deep(em) { color: rgba(255, 255, 255, 0.7); }
}

/* ─── Typing cursor ─── */
.typing-cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: #8b5cf6;
  border-radius: 2px;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>
