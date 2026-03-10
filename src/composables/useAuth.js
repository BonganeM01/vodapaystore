// src/composables/useAuth.js
import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const authStore = useAuthStore()
  const loading   = ref(false)
  const error     = ref(null)
 
  // Main login flow 
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
        'Now exchanging with VodaPay API for access token…'
      )
 
      const tokenResult = await exchangeAuthCode(authData.authCode)
 
      window.alert(
        '🔑 Access token received\n\n' +
        'Now fetching full user profile from VodaPay…'
      )
 
      const userInfo = await fetchUserInfo(tokenResult.accessToken)
 
      //user object from real data
      const user = {
        id: userInfo.userId || 'unknown-id',
        nickName: userInfo.nickName || 'Unknown',
        avatar: userInfo.avatar || '',
        name: userInfo.userName?.fullName || userInfo.nickName || 'Unknown',
        phone: userInfo.contactInfos?.find(c => c.contactType === 'MOBILE_PHONE')?.contactNo || '',
        email: userInfo.contactInfos?.find(c => c.contactType === 'EMAIL')?.contactNo || '',
        verified: userInfo.kycLevel === '03' || false,
        // extra real fields
        birthDate: userInfo.birthDate || null,
        nationality: userInfo.nationality || null,
        userId: userInfo.userId || null
      }
 
      authStore.setUser(user)
      authStore.setUserInfo(userInfo)
      authStore.setToken(tokenResult.accessToken)
 
      window.alert(
        '✅ Login Complete\n\n' +
        `Welcome, ${user.nickName}!\n` +
        // `User ID: ${user.id}\n` +
        `Access Token: ${tokenResult.accessToken ? tokenResult.accessToken.slice(0, 15) + '...' : 'N/A'}\n\n` +
        // `OpenID: ${user.openId || 'N/A'}\n` +
        `Token: ${tokenResult.accessToken || 'N/A'}\n\n` +
        'User is now stored in the Pinia auth store.'
      )
 
      return user
 
    } catch (err) {

      error.value = err.message || 'Login failed'
      window.alert(`❌ Login Error\n\n${error.value}`)
      console.error('[login] Full error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
 
  // Get auth code from Mini Program bridge
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

  // Exchange auth code → access token only
  async function exchangeAuthCode(authCode) {

    console.log('[exchangeAuthCode] STARTED with authCode:', authCode)
 
    if (!authCode || typeof authCode !== 'string') {
      throw new Error('Invalid AuthCode received')
    }
 
    const CLIENT_ID = '2020122653946739963336'
    const requestTime = new Date().toISOString().replace('Z', '+02:00')
    const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'

    console.log('[exchangeAuthCode] Using Client-Id:', CLIENT_ID)
 
    const tokenResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/authorizations/applyToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': CLIENT_ID,
        'Request-Time': requestTime,
        'Signature': signatureHeader
      },
      body: JSON.stringify({
        grantType: 'AUTHORIZATION_CODE',
        authCode: authCode
      })
    })
 
    console.log('[exchangeAuthCode] HTTP status:', tokenResponse.status)
 
    let tokenData
    try {
      tokenData = await tokenResponse.json()
      window.alert('[exchangeAuthCode] FULL TOKEN RESPONSE:\n' + JSON.stringify(tokenData, null, 2))
    } catch (parseErr) {
      const text = await tokenResponse.text()
      console.error('[exchangeAuthCode] Response is NOT JSON:', text)
      throw new Error(`Token exchange response not valid JSON: ${text.slice(0, 200)}...`)
    }
 
    if (tokenData.error || tokenData.error_description) {
      const errMsg = tokenData.error_description || tokenData.error || 'Unknown error from VodaPay'
      console.error('[exchangeAuthCode] API returned error even on 200:', errMsg, tokenData)
      throw new Error(`Token exchange failed: ${errMsg}`)
    }
 
    if (!tokenResponse.ok) {
      const errMsg = tokenData?.error_description || 'Unknown HTTP error'
      throw new Error(`Token exchange HTTP error ${tokenResponse.status}: ${errMsg}`)
    }
 
    const accessToken  = tokenData.accessToken  || tokenData.access_token  || ''
    const refreshToken = tokenData.refreshToken || tokenData.refresh_token || ''
 
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
      '\n\nNow fetching user profile...'
    )
 
    return { accessToken, refreshToken }
  }

  // Fetch user info using accessToken
  async function fetchUserInfo(accessToken) {

    try {
      if (!accessToken) {
        throw new Error('No access token available for user info fetch.')
      }
 
      window.alert(
        '[fetchUserInfo] 📨 Fetching real user info from VodaPay API...\n\n' +
        'Calling: /v2/customers/user/inquiryUserInfo\n\n' +
        'Requesting avatar, nickname, and phone from the VodaPay profile.'
      )
 
      const CLIENT_ID = '2020122653946739963336'
      const requestTime = new Date().toISOString().replace('Z', '+02:00')
      const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'

      const response = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/customers/user/inquiryUserInfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Id': CLIENT_ID,
          'Request-Time': requestTime,
          'Signature': signatureHeader
        },
        body: JSON.stringify({
          authClientId: CLIENT_ID,
          accessToken: accessToken
        })
      })
 
      console.log('[fetchUserInfo] HTTP status:', response.status)
 
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Failed to get user info: ${response.status} - ${errText}`)
      }
 
      const apiResponse = await response.json()
 
      // Show full response in alert for debugging
      window.alert(
        '[fetchUserInfo] FULL USER INFO RESPONSE:\n\n' +
        JSON.stringify(apiResponse, null, 2)
      )
 
      console.log('[fetchUserInfo] Full API response:', apiResponse)
 
      const userInfo = apiResponse?.userInfo || {}
 
      window.alert(
        '📩 Received user info from API\n\n' +
        `Nickname: ${userInfo.nickName || 'N/A'}\n` +
        'Profile display will now update.'
      )
 
      return userInfo

    } catch (err) {
      error.value = err.message || 'Failed to get user info'
      window.alert(`❌ User Info Error\n\n${error.value}`)
      console.error('[fetchUserInfo] Error:', err)
      throw err
    }
  }
 
  function logout() {
    authStore.clearUser()
    window.alert('👋 Logged out.\n\nUser has been cleared from the Pinia store.')
  }
 
  return { login, logout, loading, error }
}
 
 