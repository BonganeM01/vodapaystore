// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userInfo = ref(null) // Open user info (avatar, nickname)

  const isLoggedIn = computed(() => !!user.value)
  const displayName = computed(
    () => userInfo.value?.nickName || user.value?.name || 'Guest'
  )
  const avatarUrl = computed(() => userInfo.value?.avatar || null)

  function setUser(userData) {
    user.value = userData
  }

  function setUserInfo(info) {
    userInfo.value = info
  }

  // Called when Mini Program sends initial context on BRIDGE_READY
  function setFromMiniProgramContext(ctx) {
    if (ctx.isLoggedIn && ctx.userId) {
      user.value = { id: ctx.userId }
    }
  }

  function clearUser() {
    user.value = null
    userInfo.value = null
  }

  return {
    user, userInfo,
    isLoggedIn, displayName, avatarUrl,
    setUser, setUserInfo, setFromMiniProgramContext, clearUser,
  }
})