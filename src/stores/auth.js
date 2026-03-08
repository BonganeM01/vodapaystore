// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user     = ref(null)
  const userInfo = ref(null)
  const token    = ref(null)

  const isLoggedIn  = computed(() => !!user.value)
  const displayName = computed(() => userInfo.value?.nickName || user.value?.name || 'Guest')
  const avatarUrl   = computed(() => userInfo.value?.avatar   || null)
  const userId      = computed(() => user.value?.id           || null)

  function setUser(userData) {
    user.value = userData
  }

  function setUserInfo(info) {
    userInfo.value = info
  }

  function setToken(t) {
    token.value = t
  }

  // Called when Mini Program sends MINI_PROGRAM_CONTEXT
  // The Mini Program already has the mock user loaded in globalData,
  // so the H5 receives it here and bootstraps without any login step.
  function setFromMiniProgramContext(ctx) {
    if (ctx.isLoggedIn && ctx.userId) {
      user.value     = ctx.userInfo || { id: ctx.userId }
      userInfo.value = ctx.userInfo || null
    }
  }

  function clearUser() {
    user.value     = null
    userInfo.value = null
    token.value    = null
  }

  return {
    user, userInfo, token,
    isLoggedIn, displayName, avatarUrl, userId,
    setUser, setUserInfo, setToken,
    setFromMiniProgramContext,
    clearUser,
  }
})