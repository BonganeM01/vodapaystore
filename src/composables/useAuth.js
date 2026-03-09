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
      // Step 1: H5 asks Mini Program for an auth code
      window.alert(
        '📨 H5 → Mini Program\n\n' +
        'Sending: GET_AUTH_CODE\n\n' +
        'The Mini Program will now simulate the VodaPay consent screen.\n' +
        'Watch for the 🟡 [MOCK] alert on the native layer.'
      )
 
      const authData = await requestAuthCode()
 
      // Step 2: H5 receives auth code, shows it
      window.alert(
        '📩 Mini Program → H5\n\n' +
        'Received: AUTH_CODE_SUCCESS\n\n' +
        `Auth Code: ${authData.authCode}\n\n` +
        'Now exchanging with VodaPay API for user profile…'
      )
 
      // Step 3: Exchange auth code with VodaPay API
      const exchangeResult = await exchangeAuthCode(authData.authCode)
 
      // Step 4: Store user in Pinia
      authStore.setUser(exchangeResult.user)
      authStore.setUserInfo(exchangeResult.user)
      authStore.setToken(exchangeResult.token)
 
      window.alert(
        '✅ Login Complete\n\n' +
        `Welcome, ${exchangeResult.user.nickName}!\n` +
        `User ID: ${exchangeResult.user.id}\n` +
        `Access Token: ${exchangeResult.token.slice(0, 15)}...\n\n` +
        `OpenID: ${exchangeResult.user.openId}\n` +
        `Token: ${exchangeResult.token}\n\n` +
        'User is now stored in the Pinia auth store.'
      )
 
      return exchangeResult.user
 
    } catch (err) {
      error.value = err.message || 'Login failed'
      window.alert(`❌ Login Error\n\n${error.value}`)
      throw err
    } finally {
      loading.value = false
    }
  }
 
  // Request auth code via bridge
  function requestAuthCode() {
  return new Promise((resolve, reject) => {
    console.log("[requestAuthCode] Waiting for AUTH_CODE_SUCCESS ...");
 
    const timeout = setTimeout(() => {
      console.error("[requestAuthCode] TIMEOUT after 30s");
      unsubSuccess?.();
      unsubFail?.();
      reject(new Error("Auth code timeout – Mini Program did not respond"));
    }, 30000);
 
    const unsubSuccess = onMessage('AUTH_CODE_SUCCESS', (data) => {
      console.log("[requestAuthCode] SUCCESS received:", data);
      clearTimeout(timeout);
      unsubSuccess();
      unsubFail();
      resolve(data);
    });
 
    const unsubFail = onMessage('AUTH_CODE_FAIL', (data) => {
      console.log("[requestAuthCode] FAIL received:", data);
      clearTimeout(timeout);
      unsubSuccess();
      unsubFail();
      reject(new Error(data?.message || "Auth code request failed"));
    });
 
    sendToMiniProgram('GET_AUTH_CODE');
  });
}
 
  // Get open user info via API
  async function getOpenUserInfo() {
    try {
      const token = authStore.token
      const openId = authStore.user?.openId
 
      if (!token || !openId) {
        throw new Error('No access token or openId available. Please log in first.')
      }
 
      window.alert(
        '📨 Fetching real user info from VodaPay API...\n\n' +
        'Calling: /v2/customers/user/inquiryUserInfo\n\n' +
        'Requesting avatar, nickname, and phone from the VodaPay profile.'
      )

      const CLIENT_ID = '2020122653946739963336';
      const USER_ID = '216610000000446291765';

      const clientId = CLIENT_ID;
      const userId = USER_ID;
      const requestTime = new Date().toISOString().replace('Z', '+02:00');
      const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur';

      const response = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/customers/user/inquiryUserInfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Id': clientId,
          'Request-Time': requestTime,
          'Signature': signatureHeader
        },
        body: JSON.stringify({
          openId: openId
        })
      })
 
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Failed to get user info: ${errText || response.statusText}`)
      }
 
      const userInfo = await response.json()
 
      authStore.setUserInfo(userInfo)
 
      window.alert(
        '📩 Received user info from API\n\n' +
        `Nickname: ${userInfo.nickName}\n` +
        'Profile display will now update.'
      )
 
      return userInfo
    } catch (err) {
      error.value = err.message || 'Failed to get user info'
      window.alert(`❌ User Info Error\n\n${error.value}`)
      throw err
    }
  }
 
  function logout() {
    authStore.clearUser()
    window.alert('👋 Logged out.\n\nUser has been cleared from the Pinia store.')
  }
 
  // Exchange auth code for token and fetch user info
  async function exchangeAuthCode(authCode) {
    console.log('[exchangeAuthCode] STARTED with authCode:', authCode)
 
    if (!authCode || typeof authCode !== 'string') {
      throw new Error('Invalid AuthCode received')
    }
 
    console.log('Exchanging auth code with VodaPay API:', authCode)

    const CLIENT_ID = '2020122653946739963336';
    const USER_ID = '216610000000446291765';

    const clientId = CLIENT_ID;
    const userId = USER_ID;
    const requestTime = new Date().toISOString().replace('Z', '+02:00');
    const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur';
 
    const tokenResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/authorizations/applyToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Request-Time': requestTime,
        'Signature': signatureHeader
      },
      body: JSON.stringify({
        grantType: 'authorization_code',
        code: authCode
      })
    })

    console.log('[exchangeAuthCode] HTTP status:', tokenResponse.status);
 
    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${errText || tokenResponse.statusText}`)
    }
 
    const tokenData = await tokenResponse.json();
 
    const accessToken = tokenData?.accessToken || tokenData?.access_token || '';
    const openId = tokenData?.openId ||'';
    const unionId = tokenData?.unionId || '';
    const refreshToken = tokenData?.refreshToken || tokenData?.refresh_token || '';

    if(!accessToken){
      console.error('[exchangeAuthCode] No access token received from token exchange', tokenData);
      throw new Error('Token exchange did not return an access token')
    }

    const safeSlice = (str, len) => (typeof str === 'string' && str.length > len) ? str.slice(0, len) : str || 'N/A';
 
    window.alert(
      '[exchangeAuthCode] Tokens received:\n' +
      '\nAccess Token: ' + safeSlice(accessToken, 20) + '...' +
      '\nRefresh Token: ' + safeSlice(refreshToken, 20) + '...' +
      '\nOpenID: ' + (openId || 'N/A') +
      '\nUnionID: ' + (unionId || 'N/A') +
      '\n\nNow fetching user profile...'
    )
 
    // Fetch user profile using the new access token
    const userResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/customers/user/inquiryUserInfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        // 'Client-Id': clientId,
        // 'Request-Time': requestTime,
        // 'Signature': signatureHeader
      },
      body: JSON.stringify({
        openId: openId
      })
    })
 
    if (!userResponse.ok) {
      const errText = await userResponse.text()
      throw new Error(`User info fetch failed: ${errText || userResponse.statusText}`)
    }
 
    const userProfile = await userResponse.json()
    console.log('[exchangeAuthCode] User profile received:', userProfile)
 
    const user = {
      id: openId,
      nickName: userProfile.nickName || 'Unknown',
      avatar: userProfile.avatar || '',
      name: userProfile.nickName || 'Unknown',
      phone: userProfile.phoneNumber || '',
      verified: true,
      openId: openId,
      unionId: unionId
    }
 
    console.log('[exchangeAuthCode] Final user object:', user)
 
    return {
      user: user,
      token: accessToken,
      accessToken: accessToken,
      openId: openId,
      refreshToken: refreshToken
    }
  }
 
  return { login, logout, getOpenUserInfo, loading, error, exchangeAuthCode }
}