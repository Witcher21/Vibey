import { defineStore } from 'pinia';
import { supabase } from 'src/boot/supabase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null,
    loading: true,
  }),

  getters: {
    isLoggedIn: (state) => !!state.session,
    userEmail: (state) => state.user?.email || '',
    userName: (state) =>
      state.user?.user_metadata?.full_name ||
      state.user?.user_metadata?.name ||
      state.user?.email?.split('@')[0] ||
      'User',
    userAvatar: (state) => state.user?.user_metadata?.avatar_url || null,
  },

  actions: {
    /* ─── Initialise session from stored token ─── */
    async init() {
      this.loading = true;
      if (!supabase) {
        this.loading = false;
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        this.session = session;
        this.user = session?.user || null;

        /* Listen for auth state changes */
        supabase.auth.onAuthStateChange((_event, session) => {
          this.session = session;
          this.user = session?.user || null;
        });
      } finally {
        this.loading = false;
      }
    },

    /* ─── Sign up with email & password ─── */
    async signUp(email, password, fullName) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const redirectUrl = `${window.location.origin}/#/chat`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      this.session = data.session;
      this.user = data.user;
      return data;
    },

    /* ─── Sign in with email & password ─── */
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      this.session = data.session;
      this.user = data.user;
      return data;
    },

    /* ─── OAuth (Google, GitHub, etc.) ─── */
    async signInWithOAuth(provider) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const redirectUrl = `${window.location.origin}/#/chat`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    },

    /* ─── Sign out ─── */
    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
      this.session = null;
      this.user = null;
    },
  },
});
