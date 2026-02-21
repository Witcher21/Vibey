# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: Production image ──
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Security: run as non-root
RUN addgroup -S vibey && adduser -S vibey -G vibey

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R vibey:vibey /app
USER vibey

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
