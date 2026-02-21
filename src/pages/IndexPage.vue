<template>
  <q-page class="index-redirect">
    <div class="loading-center">
      <q-spinner-dots size="40px" color="purple" />
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { supabase } from 'src/boot/supabase';

const router = useRouter();
const auth = useAuthStore();

onMounted(async () => {
  /* If Supabase isn't configured, go straight to login for setup notice */
  if (!supabase) {
    router.replace({ name: 'login' });
    return;
  }

  await auth.init();
  if (auth.isLoggedIn) {
    router.replace({ name: 'chat' });
  } else {
    router.replace({ name: 'login' });
  }
});
</script>

<style scoped>
.index-redirect {
  background: #0a0a0f;
  min-height: 100vh;
}
.loading-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
