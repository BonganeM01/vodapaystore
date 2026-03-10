<!-- src/views/ProfileView.vue -->
<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { useVodaPayBridge } from '@/composables/useVodaPayBridge'
import { useRouter } from 'vue-router'
 
const router = useRouter()
const authStore = useAuthStore()
const { login, logout, getOpenUserInfo, loading } = useAuth()
const { sendToMiniProgram } = useVodaPayBridge()
 
// get open user info on mount if logged in
onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.userInfo) {
    try {
      await getOpenUserInfo()
    } catch (e) {
      console.warn('[Profile] Could not get open user info:', e)
    }
  }
})
 
async function handleLogin() {
  try {
    await login()
    await getOpenUserInfo()
  } catch (e) {
    console.error('[Profile] Login error:', e)
  }
}
 
function handleLogout() {
  logout()
}
 
function copyUserId() {
  if (authStore.user?.id) {
    sendToMiniProgram('COPY_TO_CLIPBOARD', { text: authStore.user.id })
  }
}
</script>
 
<template>
  <article class="profile-view">
 
    <!-- Logged in state -->
    <template v-if="authStore.isLoggedIn">
      <section class="profile-hero">
        <figure class="avatar">
          <img v-if="authStore.avatarUrl" :src="authStore.avatarUrl" :alt="authStore.displayName" />
          <span v-else class="avatar-placeholder">{{ authStore.displayName[0] }}</span>
        </figure>
        <h2 class="display-name">{{ authStore.displayName }}</h2>
        <p v-if="authStore.user?.id" class="user-id" @click="copyUserId">
          ID: {{ authStore.user.id }} <span class="copy-hint">tap to copy</span>
        </p>

        <div class="contact-info">
          <p v-if="authStore.user?.phone">
            <strong>Phone:</strong> {{ authStore.user.phone }}
          </p>
          <p v-if="authStore.user?.email">
            <strong>Email:</strong> {{ authStore.user.email }}
          </p>
          <p v-else-if="!authStore.user?.phone && !authStore.user?.email">
            <em>No contact info available</em>
          </p>
        </div>
      </section>
 
      <!-- Menu items -->
      <nav class="profile-menu card">
        <RouterLink to="/orders" class="menu-item">
          <span class="menu-icon">📦</span>
          <span class="menu-label">My Orders</span>
          <span class="menu-arrow">›</span>
        </RouterLink>
        <RouterLink to="/cart" class="menu-item">
          <span class="menu-icon">🛒</span>
          <span class="menu-label">My Cart</span>
          <span class="menu-arrow">›</span>
        </RouterLink>
        <button class="menu-item" @click="sendToMiniProgram('SHARE', {})">
          <span class="menu-icon">📤</span>
          <span class="menu-label">Share App</span>
          <span class="menu-arrow">›</span>
        </button>
      </nav>
 
      <button class="logout-btn" @click="handleLogout">Sign Out</button>
    </template>
 
    <!-- Logged out state -->
    <template v-else>
      <section class="login-hero">
        <span class="login-icon">👤</span>
        <h2>Sign in to VodaPay Store</h2>
        <p>Access your orders, wishlist, and more</p>
        <!-- ✅ Triggers the OAuth flow via Mini Program bridge -->
        <button class="login-btn" :disabled="loading" @click="handleLogin">
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign in with VodaPay</span>
        </button>
      </section>
    </template>
 
  </article>
</template>
 
<style scoped>
.profile-view { padding: 16px; padding-bottom: 100px; }
 
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  margin-bottom: 16px;
}
 
.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #E60000;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 36px; font-weight: 700; color: #fff; }
.display-name { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
.user-id { font-size: 12px; color: #999; cursor: pointer; }
.copy-hint { color: #E60000; margin-left: 4px; }
 
.profile-menu {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}
 
.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  text-decoration: none;
  color: #1A1A1A;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #F5F5F5;
  font-size: 15px;
}
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 22px; }
.menu-label { flex: 1; font-weight: 500; }
.menu-arrow { color: #CCC; font-size: 20px; }
 
.logout-btn {
  width: 100%;
  background: #fff;
  border: 1.5px solid #E60000;
  color: #E60000;
  border-radius: 24px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
 
/* Logged out */
.login-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  text-align: center;
}
.login-icon { font-size: 72px; margin-bottom: 20px; }
.login-hero h2 { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
.login-hero p { font-size: 14px; color: #666; margin-bottom: 28px; }
.login-btn {
  background: #E60000;
  color: #fff;
  border: none;
  border-radius: 26px;
  height: 52px;
  padding: 0 40px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(230,0,0,0.3);
  width: 100%;
  max-width: 280px;
}
.login-btn:disabled { opacity: 0.7; }
</style>