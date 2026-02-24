// Flow overview:
//   H5 sends GET_AUTH_CODE  ->  Mini Program (my.alert shown there)
//   Mini Program responds    ->  H5 receives AUTH_CODE_SUCCESS
//   H5 "exchanges" code      ->  mock API returns MOCK_USER
//   H5 stores user in Pinia  ->  UI updates to logged-in state

import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
import { mockExchangeAuthCode, mockGetOpenUserInfo, MOCK_USER } from '@/mock/mockAPI'

export function useAuth() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const authStore = useAuthStore()
  const loading   = ref(false)
  const error     = ref(null)

  // Full login flow
  async function login() {
    loading.value = true
    error.value   = null

    try {
      // Step 1: H5 asks Mini Program for an auth code
      // The Mini Program will show a mock "consent screen" alert,
      // then reply with AUTH_CODE_SUCCESS containing the mock code.

      
      window.alert(
        'H5 -> Mini Program\n\n' +
        'Sending: GET_AUTH_CODE\n\n' +
        'The Mini Program will now simulate the VodaPay consent screen.\n' +
        'Watch for the 🟡 [MOCK] alert on the native layer.'
      )

      const authData = await requestAuthCode()

      // Step 2: H5 receives auth code, shows it
      window.alert(
        'Mini Program -> H5\n\n' +
        'Received: AUTH_CODE_SUCCESS\n\n' +
        `Auth Code: ${authData.authCode}\n\n` +
        'Now exchanging with mock API for user profile…'
      )

      // Step 3: Exchange auth code with mock API
      // POST /auth/vodapay { authCode } if we are using an actual backend.
      const { user, token } = await mockExchangeAuthCode(authData.authCode)

      // Step 4: Store user in Pinia
      authStore.setUser(user)
      authStore.setUserInfo(user)
      authStore.setToken(token)

      window.alert(
        'Login Complete (Mock)\n\n' +
        `Welcome, ${user.nickName}!\n` +
        `User ID: ${user.id}\n` +
        `Token: ${token}\n\n` +
        'User is now stored in the Pinia auth store.'
      )

      return user

    } catch (err) {
      error.value = err.message || 'Login failed'
      window.alert(`❌ Login Error\n\n${error.value}`)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Request auth code via bridgeS
  // Sends GET_AUTH_CODE to Mini Program and waits for the reply.
  function requestAuthCode() {
    return new Promise((resolve, reject) => {
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

      // H5 -> Mini Program: triggers _handleGetAuthCode() in index.js
      sendToMiniProgram('GET_AUTH_CODE')
    })
  }

  // Get open user info via bridgeS
  function getOpenUserInfo() {
    return new Promise((resolve, reject) => {
      const unsubSuccess = onMessage('USER_INFO_SUCCESS', (data) => {
        unsubSuccess()
        unsubFail()
        authStore.setUserInfo(data.userInfo)

        window.alert(
          'Mini Program -> H5\n\n' +
          'Received: USER_INFO_SUCCESS\n\n' +
          `Nickname: ${data.userInfo?.nickName}\n` +
          'Profile display will now update.'
        )

        resolve(data.userInfo)
      })
      const unsubFail = onMessage('USER_INFO_FAIL', () => {
        unsubSuccess()
        unsubFail()
        reject(new Error('Failed to get user info'))
      })

      window.alert(
        'H5 -> Mini Program\n\n' +
        'Sending: GET_USER_INFO\n\n' +
        'Requesting avatar and nickname from the mock VodaPay profile.'
      )

      // H5 -> Mini Program: triggers _handleGetUserInfo() in index.js
      sendToMiniProgram('GET_USER_INFO')
    })
  }

  function logout() {
    authStore.clearUser()
    window.alert('👋 Logged out.\n\nUser has been cleared from the Pinia store.')
  }

  return { login, logout, getOpenUserInfo, loading, error }
}