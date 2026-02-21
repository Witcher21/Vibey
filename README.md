# 🎵 Vibey — AI Assistant

A production-ready, ChatGPT-level AI assistant with real-time streaming, file processing, web & music search, persistent memory, and a sleek dark UI.

![Tech Stack](https://img.shields.io/badge/Vue.js_+_Quasar-Frontend-8b5cf6?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Node.js_+_Express-Backend-22c55e?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Supabase-Auth_+_DB-06b6d4?style=flat-square)
![Tech Stack](https://img.shields.io/badge/OpenAI-LLM-f59e0b?style=flat-square)
![CI/CD](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-333?style=flat-square)

---

## ✨ Features

| Feature                   | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| 🔐 **Authentication**     | Email/password + OAuth (Google, GitHub) via Supabase Auth       |
| 💬 **Streaming Chat**     | Real-time token-by-token SSE streaming (like ChatGPT)           |
| 🌐 **Web Search**         | DuckDuckGo-powered internet search for live knowledge           |
| 🎵 **Music Search**       | YouTube Music search with rich playable cards                   |
| 📎 **File Upload**        | PDF, TXT, MD, CSV, JSON — extracted and analyzed by AI          |
| 🧠 **Long-Term Memory**   | AI remembers user preferences and facts across sessions         |
| 📝 **Markdown Rendering** | Full markdown support with syntax-highlighted code blocks       |
| 🎨 **Premium UI**         | Glassmorphism, gradient accents, smooth animations              |
| 🐳 **Docker Ready**       | Optimized multi-stage Dockerfile                                |
| ⚡ **CI/CD**              | GitHub Actions for testing, building, and Docker image creation |

---

## 🏗️ Architecture

```
Vibey/
├── backend/                  # Node.js + Express API server
│   ├── server.js             # Entry point
│   ├── src/
│   │   ├── agent.js          # Core agent orchestrator (SSE + tool use)
│   │   ├── config/index.js   # Environment config with validation
│   │   ├── middleware/
│   │   │   ├── auth.js       # Supabase JWT verification
│   │   │   └── rateLimiter.js
│   │   ├── routes/
│   │   │   ├── chat.js       # POST /api/chat (SSE stream)
│   │   │   └── auth.js       # GET /api/auth/me
│   │   └── services/
│   │       ├── llm.js        # OpenAI with function calling
│   │       ├── webSearch.js   # DuckDuckGo search
│   │       ├── musicSearch.js # YouTube Music InnerTube API
│   │       ├── fileProcessor.js # PDF/text extraction
│   │       ├── memory.js      # Long-term memory CRUD
│   │       └── supabase.js    # Supabase client init
│   ├── tests/agent.test.js   # Vitest test suite
│   ├── Dockerfile
│   └── package.json
├── src/                      # Vue.js + Quasar frontend
│   ├── boot/supabase.js      # Supabase client + auth guard
│   ├── components/
│   │   ├── ChatMessage.vue   # Markdown message bubble
│   │   └── MusicCard.vue     # Rich music track card
│   ├── layouts/
│   │   ├── MainLayout.vue    # App shell
│   │   └── AuthLayout.vue    # Login shell
│   ├── pages/
│   │   ├── IndexPage.vue     # Auth redirect
│   │   ├── LoginPage.vue     # Login / Sign-up
│   │   └── ChatPage.vue      # Main chat interface
│   ├── stores/
│   │   ├── auth-store.js     # Pinia auth state
│   │   └── chat-store.js     # Pinia chat + SSE streaming
│   ├── css/
│   │   ├── app.scss          # Global styles
│   │   └── quasar.variables.scss
│   └── router/routes.js
├── .github/workflows/main.yml
└── README.md
```

---

## 🗄️ Database Schema (Supabase)

Run the following SQL in your **Supabase SQL Editor** to create the required tables:

```sql
-- ════════════════════════════════════════════════════
-- Vibey — Database Schema
-- ════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Chat History ────────────────────────────────────
CREATE TABLE chat_history (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user ON chat_history (user_id, created_at DESC);

-- ─── Long-Term Memory ────────────────────────────────
CREATE TABLE long_term_memory (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  category   TEXT DEFAULT 'general' CHECK (category IN ('preference', 'fact', 'context', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_user ON long_term_memory (user_id);
CREATE UNIQUE INDEX idx_memory_user_key ON long_term_memory (user_id, key);

-- ─── Row Level Security ──────────────────────────────
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_term_memory ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can read own chat history"
  ON chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat history"
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat history"
  ON chat_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own memories"
  ON long_term_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON long_term_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON long_term_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON long_term_memory FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Service Role Bypass (for backend) ───────────────
-- The backend uses the service_role key which bypasses RLS.
-- This is intentional — the backend always filters by user_id in code.
```

---

## ⚙️ Environment Variables

### Frontend (`.env` in project root)

| Variable                 | Description                   | Example                      |
| ------------------------ | ----------------------------- | ---------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL          | `https://abcdef.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...`                |
| `VITE_API_URL`           | Backend API URL               | `http://localhost:3001`      |

### Backend (`backend/.env`)

| Variable                    | Description                         | Example                      |
| --------------------------- | ----------------------------------- | ---------------------------- |
| `PORT`                      | Server port                         | `3001`                       |
| `NODE_ENV`                  | Environment                         | `development`                |
| `SUPABASE_URL`              | Supabase project URL                | `https://abcdef.supabase.co` |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key              | `eyJhbGci...`                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret!) | `eyJhbGci...`                |
| `OPENAI_API_KEY`            | OpenAI API key                      | `sk-...`                     |
| `OPENAI_MODEL`              | Model to use                        | `gpt-4o-mini`                |
| `FRONTEND_URL`              | Allowed CORS origin                 | `http://localhost:9000`      |
| `RATE_LIMIT_WINDOW_MS`      | Rate limit window (ms)              | `60000`                      |
| `RATE_LIMIT_MAX`            | Max requests per window             | `15`                         |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Yarn** ≥ 1.22
- A [Supabase](https://supabase.com) project (free tier works fine)
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone & Install

```bash
git clone https://github.com/your-username/vibey.git
cd vibey

# Frontend dependencies
yarn install

# Backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment

```bash
# Frontend
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with all required keys
```

### 3. Setup Database

1. Go to your Supabase dashboard → **SQL Editor**
2. Paste the SQL schema from the [Database Schema](#-database-schema-supabase) section above
3. Click **Run**

### 4. Run Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
yarn quasar dev
```

The frontend opens at `http://localhost:9000` and the backend runs at `http://localhost:3001`.

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

Tests use Vitest with mocked external services (no API keys required).

---

## 🐳 Docker (Backend)

```bash
cd backend

# Build
docker build -t vibey-backend .

# Run
docker run -p 3001:3001 --env-file .env vibey-backend
```

---

## 🌐 Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set **Framework Preset** to `Other`
4. **Build Command:** `yarn build`
5. **Output Directory:** `dist/spa`
6. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`)

### Backend → Render.com

1. Create a new **Web Service** on [Render](https://render.com)
2. Point to the `backend/` directory
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. Add all backend environment variables
6. Alternatively, use the Docker deployment option

---

## 🛡️ Security

- **Supabase Auth** — JWT-based user authentication
- **Row Level Security** — Database-level isolation per user
- **Rate Limiting** — 15 requests/minute per IP (configurable)
- **Helmet** — Secure HTTP headers
- **CORS** — Whitelisted frontend origin only
- **Non-root Docker** — Container runs as unprivileged user

---

## 📜 License

MIT © Vibey
