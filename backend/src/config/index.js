import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
  },

  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:9000',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 15,
  },
};

/* ---------- startup validation ---------- */
const required = [
  ['SUPABASE_URL', config.supabase.url],
  ['SUPABASE_ANON_KEY', config.supabase.anonKey],
  ['SUPABASE_SERVICE_ROLE_KEY', config.supabase.serviceRoleKey],
  ['GROQ_API_KEY', config.groq.apiKey],
  ['DEEPSEEK_API_KEY', config.deepseek.apiKey],
];

const missing = required.filter(([, v]) => !v).map(([k]) => k);
if (missing.length && config.nodeEnv !== 'test') {
  console.error(`❌  Missing required env vars: ${missing.join(', ')}`);
  console.error('   Copy .env.example → .env and fill in the values.');
  process.exit(1);
}

export default config;
