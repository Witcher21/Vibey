<template>
  <q-page class="chat-page">
    <!-- Sidebar -->
    <aside class="chat-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-logo" v-if="!sidebarCollapsed">
          <div class="logo-orb">
            <q-icon name="auto_awesome" size="18px" />
          </div>
          <span class="sidebar-title">Vibey</span>
        </div>
        <q-btn
          flat
          round
          dense
          :icon="isMobile ? 'close' : sidebarCollapsed ? 'menu' : 'menu_open'"
          class="sidebar-toggle"
          @click="sidebarCollapsed = !sidebarCollapsed"
        />
      </div>

      <div class="sidebar-actions" v-if="!sidebarCollapsed">
        <button class="new-chat-btn" @click="handleNewChat">
          <q-icon name="add" size="18px" />
          <span>New Chat</span>
        </button>
      </div>

      <!-- Chat History List -->
      <div class="sidebar-history" v-if="!sidebarCollapsed">
        <div class="history-label">
          <q-icon name="history" size="14px" />
          <span>Chat History</span>
        </div>
        <div class="history-list">
          <div
            v-for="session in chatStore.sortedSessions"
            :key="session.id"
            class="history-item"
            :class="{ active: session.id === chatStore.activeSessionId }"
            @click="handleSwitchSession(session.id)"
          >
            <q-icon name="chat_bubble_outline" size="14px" class="history-item-icon" />
            <span class="history-item-title">{{ session.title }}</span>
            <q-btn
              flat
              round
              dense
              icon="close"
              size="8px"
              class="history-item-delete"
              @click.stop="chatStore.deleteSession(session.id)"
            />
          </div>
          <div v-if="chatStore.sessions.length === 0" class="history-empty">
            <q-icon name="forum" size="20px" />
            <span>No chats yet</span>
          </div>
        </div>
      </div>

      <!-- Pro Plan CTA -->
      <div class="sidebar-pro" v-if="!sidebarCollapsed">
        <div class="pro-card">
          <q-icon name="workspace_premium" size="20px" class="pro-icon" />
          <div class="pro-text">
            <span class="pro-title">Upgrade to Pro</span>
            <span class="pro-sub">Unlimited chats, memory &amp; more</span>
          </div>
        </div>
      </div>

      <div class="sidebar-footer" v-if="!sidebarCollapsed">
        <div class="brand-tag">
          <q-icon name="auto_awesome" size="14px" />
          <span>Vibey AI v1.0</span>
        </div>
        <div class="creator-tag">Created by <strong>G. Nawod Sanjana</strong></div>
      </div>
    </aside>

    <!-- Overlay for mobile sidebar -->
    <div class="sidebar-overlay" v-if="!sidebarCollapsed" @click="sidebarCollapsed = true"></div>

    <!-- Main chat area -->
    <main class="chat-main">
      <!-- Mobile Top Header -->
      <div class="mobile-header">
        <q-btn flat round dense icon="menu" @click="sidebarCollapsed = false" class="mobile-btn" />
        <div class="mobile-logo">
          <div class="logo-orb-small">
            <q-icon name="auto_awesome" size="16px" />
          </div>
          <span>Vibey</span>
        </div>
        <q-btn flat round dense icon="add" @click="handleNewChat" class="mobile-btn" />
      </div>

      <!-- Floating ambient glows -->
      <div v-if="chatStore.messages.length === 0" class="ambient-glow glow-1"></div>
      <div v-if="chatStore.messages.length === 0" class="ambient-glow glow-2"></div>
      <div v-if="chatStore.messages.length === 0" class="ambient-glow glow-3"></div>

      <!-- ═══ WELCOME HERO SCREEN ═══ -->
      <div v-if="chatStore.messages.length === 0" class="welcome-screen">
        <!-- Hero section -->
        <div class="hero-section">
          <!-- Animated logo orb -->
          <div class="hero-orb-wrap">
            <div class="hero-orb">
              <div class="hero-orb-inner">
                <q-icon name="auto_awesome" size="36px" />
              </div>
              <div class="orb-ring ring-1"></div>
              <div class="orb-ring ring-2"></div>
              <div class="orb-ring ring-3"></div>
            </div>
          </div>

          <!-- Tagline -->
          <div class="hero-badge">
            <span class="badge-dot"></span>
            <span>Powered by DeepSeek V3</span>
          </div>

          <h1 class="hero-heading">
            Your AI,<br />
            <span class="gradient-text">Supercharged.</span>
          </h1>
          <p class="hero-sub">
            Chat, search the web, recall memories, analyze files — all in one place.
          </p>

          <!-- Quick Action Cards (larger, card-style) -->
          <div class="action-grid">
            <button
              v-for="action in quickActions"
              :key="action.label"
              class="action-card"
              @click="sendQuickAction(action.prompt)"
            >
              <div class="action-card-icon" :style="{ background: action.color }">
                <q-icon :name="action.icon" size="20px" />
              </div>
              <div class="action-card-text">
                <span class="action-card-title">{{ action.label }}</span>
                <span class="action-card-desc">{{ action.desc }}</span>
              </div>
              <q-icon name="arrow_forward_ios" size="12px" class="action-arrow" />
            </button>
          </div>

          <!-- Suggestion chips row -->
          <div class="suggestion-row">
            <span class="suggestion-label">Try asking:</span>
            <div class="suggestion-chips">
              <button
                v-for="chip in suggestionChips"
                :key="chip"
                class="suggestion-chip"
                @click="sendQuickAction(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages list -->
      <div v-else class="messages-container" ref="messagesContainer">
        <div class="messages-list">
          <ChatMessage
            v-for="msg in chatStore.messages"
            :key="msg.id"
            :message="msg"
            user-name="You"
          />
        </div>
      </div>

      <!-- Status indicator -->
      <transition name="fade">
        <div v-if="chatStore.statusMessage" class="status-bar">
          <div class="status-dots"><span></span><span></span><span></span></div>
          <span>{{ chatStore.statusMessage }}</span>
        </div>
      </transition>

      <!-- Input area -->
      <div class="input-area">
        <div class="input-wrapper" :class="{ focused: inputFocused }">
          <!-- File upload button -->
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.txt,.md,.csv,.json,.xml,.html"
            class="hidden-file-input"
            @change="handleFileSelect"
          />
          <q-btn
            flat
            round
            dense
            icon="attach_file"
            class="attach-btn"
            @click="$refs.fileInput.click()"
            :color="attachedFile ? 'cyan' : undefined"
          />

          <!-- Attached file chip -->
          <transition name="slide-fade">
            <div v-if="attachedFile" class="file-chip">
              <q-icon name="description" size="14px" />
              <span>{{ attachedFile.name }}</span>
              <q-icon
                name="close"
                size="14px"
                class="file-chip-remove"
                @click="attachedFile = null"
              />
            </div>
          </transition>

          <!-- Text input -->
          <textarea
            ref="chatInput"
            v-model="inputText"
            placeholder="Message Vibey…"
            rows="1"
            class="chat-input"
            @keydown.enter.exact.prevent="handleSend"
            @input="autoResize"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
          ></textarea>

          <!-- Send button -->
          <q-btn
            flat
            round
            dense
            icon="arrow_upward"
            class="send-btn"
            :class="{ active: inputText.trim() || attachedFile }"
            :disabled="(!inputText.trim() && !attachedFile) || chatStore.isStreaming"
            @click="handleSend"
          />
        </div>
        <p class="disclaimer">Vibey may make mistakes. Verify important information.</p>
      </div>
    </main>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useChatStore } from 'src/stores/chat-store'
import ChatMessage from 'src/components/ChatMessage.vue'

const chatStore = useChatStore()

const isMobile = ref(window.innerWidth <= 768)
const sidebarCollapsed = ref(isMobile.value)
const inputText = ref('')
const attachedFile = ref(null)
const messagesContainer = ref(null)
const chatInput = ref(null)
const inputFocused = ref(false)

const quickActions = [
  {
    icon: 'travel_explore',
    label: 'Search the Web',
    desc: 'Get real-time news & facts',
    prompt: 'Search the web for the latest AI breakthroughs today.',
    color: 'linear-gradient(135deg, #06b6d4, #0e7490)',
  },
  {
    icon: 'psychology',
    label: 'Brainstorm Ideas',
    desc: 'Unlock creative thinking',
    prompt: 'Help me brainstorm 10 innovative startup ideas in the AI space.',
    color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  },
  {
    icon: 'code',
    label: 'Write Code',
    desc: 'Build anything faster',
    prompt: 'Write a Python function that implements binary search with comments.',
    color: 'linear-gradient(135deg, #10b981, #059669)',
  },
  {
    icon: 'description',
    label: 'Analyze a File',
    desc: 'PDF, CSV, code & more',
    prompt: 'I want to upload and analyze a document.',
    color: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
]

const suggestionChips = [
  'Who is the US president?',
  'Explain quantum computing',
  'Write a cover letter',
  "What's trending today?",
]

/* Watch for new messages to auto-scroll */
watch(
  () => chatStore.messages.length,
  () => nextTick(() => scrollToBottom()),
)

/* Watch streaming content */
watch(
  () => chatStore.messages[chatStore.messages.length - 1]?.content,
  () => {
    if (chatStore.isStreaming) {
      nextTick(() => scrollToBottom())
    }
  },
)

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function autoResize() {
  const el = chatInput.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

/* Responsive window resize listener */
function handleResize() {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

function handleNewChat() {
  chatStore.newChat()
  if (window.innerWidth <= 768) {
    sidebarCollapsed.value = true
  }
}

function handleSwitchSession(id) {
  chatStore.switchSession(id)
  if (window.innerWidth <= 768) {
    sidebarCollapsed.value = true
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    attachedFile.value = file
  }
  event.target.value = ''
}

async function handleSend() {
  const text = inputText.value.trim()
  const file = attachedFile.value
  if (!text && !file) return
  if (chatStore.isStreaming) return

  inputText.value = ''
  attachedFile.value = null

  if (chatInput.value) {
    chatInput.value.style.height = 'auto'
  }

  await chatStore.sendMessage(text || 'Please analyze this file.', file)
}

function sendQuickAction(prompt) {
  inputText.value = prompt
  handleSend()
}
</script>

<style lang="scss" scoped>
.chat-page {
  display: flex;
  height: 100vh;
  /* Fix iOS Safari 100vh issue pushing input offscreen */
  height: 100dvh;
  background: transparent;
  color: #fff;
  overflow: hidden;
}

/* ═══ Sidebar ═══ */
.chat-sidebar {
  width: 260px;
  min-width: 260px;
  background: rgba(5, 5, 12, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &.collapsed {
    width: 60px;
    min-width: 60px;
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-orb {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #06b6d4);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.3px;
  /* Protect tail of 'y' from getting cropped */
  padding-bottom: 4px;
  line-height: normal;
  padding-right: 4px;
  display: inline-block;
}
.sidebar-toggle {
  color: rgba(255, 255, 255, 0.4);
}

.sidebar-actions {
  padding: 0 12px;
}
.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px dashed rgba(139, 92, 246, 0.35);
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;
  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.55);
    color: #fff;
    transform: translateY(-1px);
  }
}

/* ═══ Chat History ═══ */
.sidebar-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px 12px 0;
  overflow: hidden;
}

.history-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 4px 8px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.25);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.45);
  }
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  position: relative;
  border: 1px solid transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    .history-item-delete {
      opacity: 1;
    }
  }

  &.active {
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.25);
    .history-item-icon {
      color: #a78bfa;
    }
    .history-item-title {
      color: rgba(255, 255, 255, 0.95);
    }
  }
}

.history-item-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.25);
  transition: color 0.2s;
}

.history-item-title {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.history-item-delete {
  flex-shrink: 0;
  opacity: 0;
  color: rgba(255, 255, 255, 0.3) !important;
  transition:
    opacity 0.2s,
    color 0.2s;
  &:hover {
    color: #f87171 !important;
  }
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: rgba(255, 255, 255, 0.15);
  font-size: 12px;
}

.sidebar-pro {
  padding: 12px;
  margin-top: 16px;
}
.pro-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.06));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s;
  &:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(6, 182, 212, 0.12));
    border-color: rgba(139, 92, 246, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.15);
  }
}
.pro-icon {
  color: #fbbf24;
}
.pro-text {
  display: flex;
  flex-direction: column;
}
.pro-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}
.pro-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.brand-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.22);
  font-size: 12px;
}
.creator-tag {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.creator-tag strong {
  color: rgba(255, 255, 255, 0.75);
  font-weight: 600;
}

/* ═══ Main Chat Area ═══ */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px 20px;
  text-align: center;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Ambient glows behind the hero */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  animation: drift 12s ease-in-out infinite alternate;
}
.glow-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}
.glow-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
  bottom: -80px;
  right: -80px;
  animation-delay: -4s;
}
.glow-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.07) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -8s;
}
@keyframes drift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(30px, 20px) scale(1.08);
  }
}

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 680px;
  width: 100%;
  z-index: 1;
  margin: auto 0;
  flex-shrink: 0;
}

/* Orb */
.hero-orb-wrap {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}
.hero-orb {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-orb-inner {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 8px 32px rgba(6, 182, 212, 0.4),
    0 16px 48px rgba(124, 58, 237, 0.3);
  animation: pulse-orb 3s ease-in-out infinite;
}
@keyframes pulse-orb {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 8px 32px rgba(6, 182, 212, 0.4),
      0 16px 48px rgba(124, 58, 237, 0.3);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.15),
      0 8px 40px rgba(6, 182, 212, 0.6),
      0 20px 60px rgba(124, 58, 237, 0.5);
  }
}

.orb-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(6, 182, 212, 0.2);
  animation: spin-ring linear infinite;
}
.ring-1 {
  width: 100px;
  height: 100px;
  top: -14px;
  left: -14px;
  animation-duration: 8s;
}
.ring-2 {
  width: 120px;
  height: 120px;
  top: -24px;
  left: -24px;
  animation-duration: 14s;
  animation-direction: reverse;
  border-color: rgba(139, 92, 246, 0.15);
}
.ring-3 {
  width: 140px;
  height: 140px;
  top: -34px;
  left: -34px;
  animation-duration: 20s;
  border-color: rgba(255, 255, 255, 0.05);
}
@keyframes spin-ring {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 100px;
  font-size: 12px;
  color: rgba(6, 182, 212, 0.9);
  letter-spacing: 0.3px;
}
.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #06b6d4;
  box-shadow: 0 0 8px #06b6d4;
  animation: blink-dot 2s ease-in-out infinite;
}
@keyframes blink-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* Heading */
.hero-heading {
  font-size: clamp(32px, 5vw, 52px);
  font-weight: 800;
  line-height: 1.15;
  margin: 0;
  color: #fff;
  letter-spacing: -1.5px;
}
.gradient-text {
  background: linear-gradient(135deg, #a78bfa 0%, #06b6d4 60%, #34d399 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  /* Protect tail of 'p' and 'g' from getting cropped */
  padding-bottom: 0.15em;
  padding-right: 0.1em;
  display: inline-block;
  line-height: normal;
}

.hero-sub {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  line-height: 1.6;
  max-width: 500px;
}

/* Action Cards grid */
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    &::before {
      opacity: 1;
    }
    .action-arrow {
      opacity: 1;
      transform: translateX(2px);
    }
  }
}

.action-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.action-card-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.action-card-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-card-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-arrow {
  color: rgba(255, 255, 255, 0.2);
  opacity: 0;
  transition: all 0.3s;
}

/* Suggestion chips */
.suggestion-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.suggestion-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  white-space: nowrap;
}
.suggestion-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.suggestion-chip {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(6, 182, 212, 0.1);
    border-color: rgba(6, 182, 212, 0.3);
    color: #fff;
  }
}

/* ═══ Messages ═══ */
.messages-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 0;
  scroll-behavior: smooth;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
  }
}
.messages-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 28px;
}

/* ═══ Status bar ═══ */
.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 8px 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}
.status-dots {
  display: flex;
  gap: 4px;
  span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #8b5cf6;
    animation: bounce-dot 1.2s ease-in-out infinite;
    &:nth-child(2) {
      animation-delay: 0.15s;
    }
    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
}
@keyframes bounce-dot {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* ═══ Input area ═══ */
.input-area {
  padding: 12px 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 20;
}

.input-wrapper {
  width: 100%;
  max-width: 800px;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: rgba(15, 15, 25, 0.55);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 10px 10px 10px 6px;
  transition: all 0.3s ease;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);

  &.focused {
    border-color: rgba(6, 182, 212, 0.45);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 0 0 3px rgba(6, 182, 212, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
}

.hidden-file-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.attach-btn {
  color: rgba(255, 255, 255, 0.35);
  transition: color 0.2s;
  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
}

.file-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 8px;
  font-size: 12px;
  color: #67e8f9;
  white-space: nowrap;
  margin-bottom: 4px;
}
.file-chip-remove {
  cursor: pointer;
  opacity: 0.6;
  &:hover {
    opacity: 1;
  }
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  padding: 8px 4px;
  max-height: 160px;
  line-height: 1.55;
  &::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }
}

.send-btn {
  color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  width: 44px;
  height: 44px;
  margin-bottom: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &.active {
    background: linear-gradient(135deg, #06b6d4, #7c3aed);
    color: #fff;
    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.45);
    transform: scale(1.05);
  }
}

.disclaimer {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.18);
  margin: 8px 0 0;
  text-align: center;
}

/* ═══ Transitions ═══ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* ═══ Responsive ═══ */
/* Overlay for mobile */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 80;
  backdrop-filter: blur(4px);
}

.mobile-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(12px);
  z-index: 50;
  flex-shrink: 0;
  min-height: 56px;
}

.mobile-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  line-height: normal;
}
.mobile-logo span {
  padding-bottom: 3px;
}

.logo-orb-small {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.mobile-btn {
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  .chat-sidebar {
    position: fixed;
    z-index: 100;
    height: 100vh;
    left: 0;
    top: 0;
    transform: translateX(0);
    &.collapsed {
      width: 260px; /* retain width to transition nicely */
      min-width: 260px;
      transform: translateX(-100%);
    }
  }

  /* Show overlay if sidebar is open */
  .chat-sidebar:not(.collapsed) ~ .sidebar-overlay {
    display: block;
  }

  /* Don't hide the sidebar-toggle so it acts as a close button when the menu is open */

  .mobile-header {
    display: flex;
  }

  .hero-heading {
    font-size: 26px;
    padding: 0 10px;
  }

  .hero-sub {
    font-size: 14px;
    padding: 0 16px;
  }

  .action-grid {
    grid-template-columns: 1fr;
    padding: 0 16px;
  }

  .suggestion-chips {
    white-space: nowrap;
    width: 100%;
    padding: 0 16px;
  }

  .input-area {
    padding: 10px 10px 12px;
  }
}

@media (max-width: 480px) {
  .hero-orb-wrap {
    transform: scale(0.85);
  }
}
</style>
