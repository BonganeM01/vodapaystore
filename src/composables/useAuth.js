import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
import { mockExchangeAuthCode, mockGetOpenUserInfo, MOCK_USER } from '@/mock/mockAPI'
 
export function useAuth() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const authStore = useAuthStore()
  const loading   = ref(false)
  const error     = ref(null)
 
  async function login() {
    loading.value = true
    error.value   = null
 
    try {
      window.alert(
        '📨 H5 → Mini Program\n\n' +
        'Sending: GET_AUTH_CODE\n\n' +
        'The Mini Program will now simulate the VodaPay consent screen.\n' +
        'Watch for the native popup on the device.'
      )
 
      const authData = await requestAuthCode()
 
      window.alert(
        '📩 Mini Program → H5\n\n' +
        'Received: AUTH_CODE_SUCCESS\n\n' +
        `Auth Code: ${authData.authCode}\n\n` +
        'Now exchanging with mock API for user profile…'
      )
 
      const { user, token } = await mockExchangeAuthCode(authData.authCode)
 
      authStore.setUser(user)
      authStore.setUserInfo(user)
      authStore.setToken(token)
 
      window.alert(
        '✅ Login Complete (Mock)\n\n' +
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
 
      sendToMiniProgram('GET_AUTH_CODE')
    })

  }
 
  function getOpenUserInfo() {
    return new Promise((resolve, reject) => {
      const unsubSuccess = onMessage('USER_INFO_SUCCESS', (data) => {
        unsubSuccess()
        unsubFail()
        authStore.setUserInfo(data.userInfo)

        window.alert(
          '📩 Mini Program → H5\n\n' +
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
        '📨 H5 → Mini Program\n\n' +
        'Sending: GET_USER_INFO\n\n' +
        'Requesting avatar and nickname from the mock VodaPay profile.'
      )
 
      sendToMiniProgram('GET_USER_INFO')
    })

  }
 
  function logout() {
    authStore.clearUser()
    window.alert('👋 Logged out.\n\nUser has been cleared from the Pinia store.')
  }
 
  return { login, logout, getOpenUserInfo, loading, error }
}
 