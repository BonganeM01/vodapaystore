import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
import { mockExchangeAuthCode, mockGetOpenUserInfo, MOCK_USER } from '@/mock/mockAPI'
 
export function useAuth() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const authStore = useAuthStore()
  const loading   = ref(false)
  const error     = ref(null)
 
  // ── Full login flow ───────────────────────────────────────────
  async function login() {
    loading.value = true
    error.value   = null
 
    try {
      // ── Step 1: H5 asks Mini Program for an auth code ─────────
      window.alert(
        '📨 H5 → Mini Program\n\n' +
        'Sending: GET_AUTH_CODE\n\n' +
        'The Mini Program will now simulate the VodaPay consent screen.\n' +
        'Watch for the 🟡 [MOCK] alert on the native layer.'
      )
 
      const authData = await requestAuthCode()
 
      // ── Step 2: H5 receives auth code, shows it ───────────────
      window.alert(
        '📩 Mini Program → H5\n\n' +
        'Received: AUTH_CODE_SUCCESS\n\n' +
        `Auth Code: ${authData.authCode}\n\n` +
        'Now exchanging with mock API for user profile…'
      )
 
      // ── Step 3: Exchange auth code with mock API ───────────────
      const { user, token } = await exchangeAuthCode(authData.authCode)
 
      // ── Step 4: Store user in Pinia ───────────────────────────
      authStore.setUser(user)
      authStore.setUserInfo(user)
      authStore.setToken(token)
 
      window.alert(
        '✅ Login Complete (Mock)\n\n' +
        `Welcome, ${user.nickName}!\n` +
        `User ID: ${user.id}\n` +
        `Access Token: ${token.slice(0, 15)}...\n\n` +
        `OpenID: ${user.openId}\n` +
        `Token: ${token}\n\n` +
        'User is now stored in the Pinia auth store.'
      )
 
      return user
 
    } catch (err) {
      error.value = err.message || 'Login failed'
      //window.alert(`❌ Login Error\n\n${error.value}`)
      throw err
    } finally {
      loading.value = false
    }
  }
 
  // ── Request auth code via bridge ──────────────────────────────
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
 
      // ✅ H5 → Mini Program: triggers _handleGetAuthCode() in index.js
      sendToMiniProgram('GET_AUTH_CODE')
    })
  }
 
  // ── Get open user info via bridge ─────────────────────────────
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
 
      // ✅ H5 → Mini Program: triggers _handleGetUserInfo() in index.js
      sendToMiniProgram('GET_USER_INFO')
    })
  }
 
  function logout() {
    authStore.clearUser()
    window.alert('👋 Logged out.\n\nUser has been cleared from the Pinia store.')
  }
 
  // Reverse-Engineered "applyAuthCode"
  // IRL this is a server-to-server POST call to Vodapay
  async function exchangeAuthCode(authCode) {

    console.log('[exchangeAuthCode] STARTED with authCode:', authCode)

    await new Promise((resolve) => setTimeout(resolve, 800)) // simulate network delay

    console.log('[exchangeAuthCode] Simulated newtwork delay complete.')

    if(!authCode || typeof authCode !== 'string') {
      throw new Error('Invalid AuthCode received')
    }

    console.log('Exchanging auth code with mock API:', authCode)

    //Actual applyAuthCode response
    const mockResponse = {
      access_token: `at_${Date.now()}_vdp_real_token_${Math.random().toString(36).slice(2)}`,
      expires_in: 7200,
      refresh_token: `rt_${Date.now()}_vdp_real_refresh_token_${Math.random().toString(36).slice(2)}`,
      token_type: 'Bearer',
      openId: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      unionId: `un_${Date.now()}_global_user`
    }

    window.alert(
      '[exchangeAuthCode] Generated mock tokens:' +
      '\nAccess Token: ' + mockResponse.access_token.slice(0, 15) + '...' +
      '\nRefresh Token: ' + mockResponse.refresh_token.slice(0, 15) + '...' +
      '\nOpenID: ' + mockResponse.openId +
      '\nUnionID: ' + mockResponse.unionId
    )

    //Simulate fetching user profile with the access token
    const userProfile = {
      id: mockResponse.openId,
      nickName: userInfo.nickName || "Thabo Nkosi",
      avatar: userInfo.avatar || '',
      name: "Thabo Nkosi",
      phone: '+27 82 555 0101',
      verified: true,
      openId: mockResponse.openId,
      unionId: mockResponse.unionId
    }

    console.log('[exchangeAuthCode] Final user object:', userProfile)

    return{
      user: userProfile,
      token:        mockResponse.access_token,
      accessToken:  mockResponse.access_token,
      openId:       mockResponse.openId,
      refreshToken: mockResponse.refresh_token
    }
  }
 
  return { login, logout, getOpenUserInfo, loading, error, exchangeAuthCode }

}
