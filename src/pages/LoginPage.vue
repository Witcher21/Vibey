<template>
  <div class="login-page">
    <!-- Animated background -->
    <div class="bg-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="login-card">
      <!-- Logo -->
      <div class="logo-section">
        <div class="logo-icon">
          <q-icon name="auto_awesome" size="36px" />
        </div>
        <h1 class="logo-text">Vibey</h1>
        <p class="logo-sub">Your intelligent AI companion</p>
      </div>

      <!-- Tab toggle -->
      <div class="auth-toggle">
        <button
          :class="['toggle-btn', { active: mode === 'login' }]"
          @click="mode = 'login'"
        >
          Sign In
        </button>
        <button
          :class="['toggle-btn', { active: mode === 'signup' }]"
          @click="mode = 'signup'"
        >
          Sign Up
        </button>
        <div class="toggle-slider" :class="mode"></div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="auth-form">
        <!-- Name (signup only) -->
        <transition name="slide-fade">
          <div v-if="mode === 'signup'" class="input-group">
            <q-icon name="person_outline" class="input-icon" />
            <input
              v-model="form.name"
              type="text"
              placeholder="Full name"
              autocomplete="name"
              required
            />
          </div>
        </transition>

        <div class="input-group">
          <q-icon name="mail_outline" class="input-icon" />
          <input
            v-model="form.email"
            type="email"
            placeholder="Email address"
            autocomplete="email"
            required
          />
        </div>

        <div class="input-group">
          <q-icon name="lock_outline" class="input-icon" />
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Password"
            autocomplete="current-password"
            required
            minlength="6"
          />
          <q-icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            class="input-icon-right"
            @click="showPassword = !showPassword"
          />
        </div>

        <!-- Error -->
        <transition name="slide-fade">
          <div v-if="error" class="error-banner">
            <q-icon name="error_outline" size="18px" />
            <span>{{ error }}</span>
          </div>
        </transition>

        <!-- Success (signup confirmation) -->
        <transition name="slide-fade">
          <div v-if="successMessage" class="success-banner">
            <q-icon name="check_circle_outline" size="18px" />
            <span>{{ successMessage }}</span>
          </div>
        </transition>

        <button type="submit" class="submit-btn" :disabled="loading">
          <q-spinner v-if="loading" size="20px" color="white" />
          <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
        </button>
      </form>

      <!-- Divider -->
      <div class="divider">
        <span>or continue with</span>
      </div>

      <!-- OAuth -->
      <div class="oauth-row">
        <button class="oauth-btn" @click="oauthLogin('google')" title="Google">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Google</span>
        </button>
        <button class="oauth-btn" @click="oauthLogin('github')" title="GitHub">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          <span>GitHub</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { supabase } from 'src/boot/supabase';

const router = useRouter();
const $q = useQuasar();
const auth = useAuthStore();

const mode = ref('login');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const form = reactive({
  name: '',
  email: '',
  password: '',
});

function showConfigWarning() {
  $q.notify({
    type: 'warning',
    position: 'top',
    timeout: 6000,
    message: 'Supabase not configured',
    caption:
      'Create a .env file in the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase dashboard.',
    icon: 'warning',
    actions: [{ label: 'Got it', color: 'yellow' }],
  });
}

async function handleSubmit() {
  if (!supabase) {
    showConfigWarning();
    return;
  }

  loading.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    if (mode.value === 'signup') {
      await auth.signUp(form.email, form.password, form.name);
      successMessage.value = 'Account created! Check your email to confirm.';
    } else {
      await auth.signIn(form.email, form.password);
      const redirect = router.currentRoute.value.query.redirect || '/chat';
      router.push(redirect);
    }
  } catch (err) {
    error.value = err.message || 'Authentication failed.';
  } finally {
    loading.value = false;
  }
}

async function oauthLogin(provider) {
  if (!supabase) {
    showConfigWarning();
    return;
  }

  try {
    await auth.signInWithOAuth(provider);
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  position: relative;
  overflow: hidden;
  padding: 20px;
}

/* ─── Animated background orbs ─── */
.bg-orbs {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}
.orb-1 {
  width: 400px; height: 400px;
  background: #7c3aed;
  top: -10%; left: -5%;
  animation-delay: 0s;
}
.orb-2 {
  width: 350px; height: 350px;
  background: #06b6d4;
  bottom: -10%; right: -5%;
  animation-delay: -7s;
}
.orb-3 {
  width: 250px; height: 250px;
  background: #f472b6;
  top: 50%; left: 60%;
  animation-delay: -14s;
}
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* ─── Card ─── */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
  background: rgba(18, 18, 28, 0.85);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(124, 58, 237, 0.15);
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

/* ─── Logo ─── */
.logo-section {
  text-align: center;
  margin-bottom: 28px;
}
.logo-icon {
  width: 64px; height: 64px;
  margin: 0 auto 12px;
  border-radius: 18px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.35);
}
.logo-text {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
  margin: 0;
}
.logo-sub {
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  margin: 4px 0 0;
}

/* ─── Toggle ─── */
.auth-toggle {
  display: flex;
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}
.toggle-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border-radius: 10px;
  position: relative;
  z-index: 1;
  transition: color 0.3s ease;
  &.active { color: #fff; }
}
.toggle-slider {
  position: absolute;
  top: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: rgba(124, 58, 237, 0.35);
  border-radius: 10px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &.login { left: 4px; }
  &.signup { left: calc(50%); }
}

/* ─── Form ─── */
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.input-group {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus-within {
    border-color: rgba(124, 58, 237, 0.5);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
}
.input-icon { color: rgba(255, 255, 255, 0.35); font-size: 20px; }
.input-icon-right {
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  font-size: 20px;
  &:hover { color: rgba(255, 255, 255, 0.6); }
}
.input-group input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  padding: 14px 12px;
  font-size: 15px;
  font-family: inherit;
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
}

/* ─── Buttons ─── */
.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

/* ─── Status banners ─── */
.error-banner,
.success-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}
.error-banner {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.success-banner {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

/* ─── Divider ─── */
.divider {
  display: flex;
  align-items: center;
  margin: 20px 0 16px;
  gap: 12px;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }
  span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    white-space: nowrap;
  }
}

/* ─── OAuth ─── */
.oauth-row {
  display: flex;
  gap: 12px;
}
.oauth-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
}

/* ─── Transitions ─── */
.slide-fade-enter-active { transition: all 0.3s ease; }
.slide-fade-leave-active { transition: all 0.2s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(-8px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
