// src/composables/useAuth.js
//
// Handles the complete VodaPay OAuth authentication flow:
//
//   1. H5 sends GET_AUTH_CODE → Mini Program
//   2. Mini Program calls my.getAuthCode() → VodaPay shows consent UI
//   3. VodaPay returns authCode → Mini Program → H5 (AUTH_CODE_SUCCESS)
//   4. H5 sends authCode to YOUR backend API
//   5. Backend exchanges authCode for accessToken via VodaPay's
//      /v2/authorizations/applyToken endpoint
//   6. Backend returns user profile → H5 stores it in the auth store

import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

// Your backend base URL — replace with actual endpoint
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.your-backend.com'

export function useAuth() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref(null)

  // ── Trigger the full login flow ────────────────────────────
  async function login() {
    loading.value = true
    error.value = null

    try {
      // ✅ Step 1: Request auth code from VodaPay via Mini Program bridge
      // Mini Program will call my.getAuthCode() and return AUTH_CODE_SUCCESS
      const authData = await requestAuthCode()

      // ✅ Step 4 & 5: Send authCode to your backend.
      // NEVER exchange tokens client-side — always do this server-to-server.
      const userProfile = await exchangeAuthCodeForUser(authData.authCode)

      // ✅ Step 6: Store user in Pinia and mark as logged in
      authStore.setUser(userProfile)
      return userProfile

    } catch (err) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── Request auth code via bridge ───────────────────────────
  function requestAuthCode() {
    return new Promise((resolve, reject) => {
      // Subscribe to success/fail responses from Mini Program
      const unsubSuccess = onMessage('AUTH_CODE_SUCCESS', (data) => {
        unsubSuccess()
        unsubFail()
        resolve(data)
      })
      const unsubFail = onMessage('AUTH_CODE_FAIL', (data) => {
        unsubSuccess()
        unsubFail()
        reject(new Error('Auth code request failed'))
      })

      // ✅ Send the auth code request to the Mini Program
      sendToMiniProgram('GET_AUTH_CODE')
    })
  }

  // ── Exchange auth code for user profile (backend call) ────
  async function exchangeAuthCodeForUser(authCode) {
    // This hits YOUR backend, which then calls VodaPay's token API.
    // Backend endpoint should:
    //   1. POST to VodaPay /v2/authorizations/applyToken with authCode
    //   2. Use returned accessToken to call VodaPay user API
    //   3. Return the user profile to this H5 app
    const response = await axios.post(`${API_BASE}/auth/vodapay`, { authCode })
    return response.data.user
  }

  // ── Get open user info (non-sensitive, no OAuth needed) ───
  function getOpenUserInfo() {
    return new Promise((resolve, reject) => {
      const unsubSuccess = onMessage('USER_INFO_SUCCESS', (data) => {
        unsubSuccess()
        unsubFail()
        authStore.setUserInfo(data.userInfo)
        resolve(data.userInfo)
      })
      const unsubFail = onMessage('USER_INFO_FAIL', (data) => {
        unsubSuccess()
        unsubFail()
        reject(new Error('Failed to get user info'))
      })

      // ✅ Request non-sensitive profile (avatar, nickname) from Mini Program
      sendToMiniProgram('GET_USER_INFO')
    })
  }

  function logout() {
    authStore.clearUser()
  }

  return { login, logout, getOpenUserInfo, loading, error }
}