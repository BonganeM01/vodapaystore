// src/composables/useAuth.js
import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
 
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
        'Watch for the 🟡 [MOCK] alert on the native layer.'
      )
 
      const authData = await requestAuthCode()
 
      window.alert(
        '📩 Mini Program → H5\n\n' +
        'Received: AUTH_CODE_SUCCESS\n\n' +
        `Auth Code: ${authData.authCode}\n\n` +
        'Now exchanging with VodaPay API for user profile…'
      )
 
      const exchangeResult = await exchangeAuthCode(authData.authCode)
 
      authStore.setUser(exchangeResult.user)
      authStore.setUserInfo(exchangeResult.user)
      authStore.setToken(exchangeResult.token)
 
      window.alert(
        '✅ Login Complete\n\n' +
        `Welcome, ${exchangeResult.user.nickName}!\n` +
        // `User ID: ${exchangeResult.user.id}\n` +
        `Access Token: ${exchangeResult.token ? exchangeResult.token.slice(0, 15) + '...' : 'N/A'}\n\n` +
        // `OpenID: ${exchangeResult.user.openId || 'N/A'}\n` +
        `Token: ${exchangeResult.token || 'N/A'}\n\n` +
        'User is now stored in the Pinia auth store.'
      )
 
      return exchangeResult.user
 
    } catch (err) {
      error.value = err.message || 'Login failed'
      window.alert(`❌ Login Error\n\n${error.value}`)
      console.error('[login] Full error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
 
  function requestAuthCode() {
    return new Promise((resolve, reject) => {
      console.log("[requestAuthCode] Waiting for AUTH_CODE_SUCCESS ...")
 
      const timeout = setTimeout(() => {
        console.error("[requestAuthCode] TIMEOUT after 30s")
        unsubSuccess?.()
        unsubFail?.()
        reject(new Error("Auth code timeout – Mini Program did not respond"))
      }, 30000)
 
      const unsubSuccess = onMessage('AUTH_CODE_SUCCESS', (data) => {
        console.log("[requestAuthCode] SUCCESS received:", data)
        clearTimeout(timeout)
        unsubSuccess()
        unsubFail()
        resolve(data)
      })
 
      const unsubFail = onMessage('AUTH_CODE_FAIL', (data) => {
        console.log("[requestAuthCode] FAIL received:", data)
        clearTimeout(timeout)
        unsubSuccess()
        unsubFail()
        reject(new Error(data?.message || "Auth code request failed"))
      })
 
      sendToMiniProgram('GET_AUTH_CODE')
    })
  }
 
  async function getOpenUserInfo() {
    try {
      const token = authStore.token
      //const openId = authStore.user?.openId
 
      if (!token) {
        throw new Error('No access token available. Please log in first.')
      }
 
      window.alert(
        '📨 Fetching real user info from VodaPay API...\n\n' +
        'Calling: /v2/customers/user/inquiryUserInfo\n\n' +
        'Requesting avatar, nickname, and phone from the VodaPay profile.'
      )
 
      const CLIENT_ID = '2020122653946739963336'
      const USER_ID = '216610000000446291765'
 
      const clientId = CLIENT_ID
      const userId = USER_ID
      const requestTime = new Date().toISOString().replace('Z', '+02:00')
      const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'
 
      const response = await fetch(
        "https://vodapay-gateway.sandbox.vfs.africa/v2/customers/user/inquiryUserInfo",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Id': clientId,
            'Request-Time': requestTime,
            'Signature': signatureHeader,
          },
          body: JSON.stringify({
            'Client-Id': clientId,
            'accessToken': accessToken
          }),
        },
      );
 
      console.log('[getOpenUserInfo] HTTP status:', response.status)
 
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Failed to get user info: ${response.status} - ${errText}`)
      }
 
      const userInfo = await response.json()
      console.log('[getOpenUserInfo] Response:', userInfo)
 
      authStore.setUserInfo(userInfo)
 
      window.alert(
        '📩 Received user info from API\n\n' +
        `Nickname: ${userInfo.nickName || 'N/A'}\n` +
        'Profile display will now update.'
      )
 
      return userInfo
    } catch (err) {
      error.value = err.message || 'Failed to get user info'
      window.alert(`❌ User Info Error\n\n${error.value}`)
      console.error('[getOpenUserInfo] Error:', err)
      throw err
    }
  }
 
  function logout() {
    authStore.clearUser()
    window.alert('👋 Logged out.\n\nUser has been cleared from the Pinia store.')
  }
 
  async function exchangeAuthCode(authCode) {
    console.log('[exchangeAuthCode] STARTED with authCode:', authCode)
 
    if (!authCode || typeof authCode !== 'string') {
      throw new Error('Invalid AuthCode received')
    }
 
    const CLIENT_ID = '2020122653946739963336'
    const USER_ID = '216610000000446291765'
 
    const clientId = CLIENT_ID
    const userId = USER_ID
    const requestTime = new Date().toISOString().replace('Z', '+02:00')
    const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'
 
    console.log('[exchangeAuthCode] Using Client-Id:', clientId)
 
    const tokenResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/authorizations/applyToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Request-Time': requestTime,
        'Signature': signatureHeader
      },
      body: JSON.stringify({
        'grantType': 'AUTHORIZATION_CODE', 
        'authCode': authCode
        //'clientId': clientId
      })
    })
 
    console.log('[exchangeAuthCode] HTTP status:', tokenResponse.status)
 
    let tokenData
    try {
      tokenData = await tokenResponse.json()
      window.alert('[exchangeAuthCode] FULL RESPONSE BODY:\n' + JSON.stringify(tokenData, null, 2))
    } catch (parseErr) {
      const text = await tokenResponse.text()
      console.error('[exchangeAuthCode] Response is NOT JSON:', text)
      throw new Error(`Token exchange response not valid JSON: ${text.slice(0, 200)}...`)
    }
 
    // Handle both success and error responses
    if (tokenData.error || tokenData.error_description) {
      const errMsg = tokenData.error_description || tokenData.error || 'Unknown error from VodaPay'
      console.error('[exchangeAuthCode] API returned error even on 200:', errMsg, tokenData)
      throw new Error(`Token exchange failed: ${errMsg}`)
    }
 
    if (!tokenResponse.ok) {
      const errMsg = tokenData?.error_description || 'Unknown HTTP error'
      throw new Error(`Token exchange HTTP error ${tokenResponse.status}: ${errMsg}`)
    }
 
    // Extract tokens: support both camelCase and snake_case
    const accessToken  = tokenData.accessToken  || tokenData.access_token  || ''
    const refreshToken = tokenData.refreshToken || tokenData.refresh_token || ''
    // const openId       = tokenData.openId       || ''
    // const unionId      = tokenData.unionId      || ''
 
    if (!accessToken) {
      console.error('[exchangeAuthCode] No access token in response. Full body was:', tokenData)
      throw new Error('Token exchange did not return an access token')
    }
 
    const safeSlice = (str, len) => {
      if (typeof str !== 'string') return 'N/A'
      return str.length > len ? str.slice(0, len) + '...' : str
    }
 
    window.alert(
      '[exchangeAuthCode] Tokens received:\n' +
      '\nAccess Token: ' + safeSlice(accessToken, 20) +
      '\nRefresh Token: ' + safeSlice(refreshToken, 20) +
      // '\nOpenID: ' + (openId || 'N/A') +
      // '\nUnionID: ' + (unionId || 'N/A') +
      '\n\nNow fetching user profile...'
    )
 
    // Fetch user profile using the access token
    const userResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/customers/user/inquiryUserInfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        //'Authorization': `Bearer ${accessToken}`,
        'Client-Id': clientId,
        'Request-Time': requestTime,
        'Signature': signatureHeader
      },
      body: JSON.stringify({ 'Client-Id': clientId, 'accessToken': accessToken })
    })
 
    if (!userResponse.ok) {
      const errText = await userResponse.text()
      throw new Error(`User info fetch failed: ${userResponse.status} - ${errText}`)
    }
 
    const userProfile = await userResponse.json()
    console.log('[exchangeAuthCode] User profile:', userProfile)
 
    const user = {
      //id: openId,
      nickName: userProfile.nickName || 'Unknown',
      avatar: userProfile.avatar || '',
      name: userProfile.nickName || 'Unknown',
      phone: userProfile.phoneNumber || '',
      verified: true
      // openId,
      // unionId
    }
 
    console.log('[exchangeAuthCode] Final user object:', user)
 
    return {
      user,
      token: accessToken,
      accessToken,
      // openId,
      refreshToken
    }
  }
 
  return { login, logout, getOpenUserInfo, loading, error, exchangeAuthCode }
}