// src/composables/useVodaPayBridge.js
import { ref, onMounted, onUnmounted } from 'vue'

const messageListeners = new Map()

// Detect if running inside VodaPay WebView
export function useIsInMiniProgram() {
  const isInMiniProgram = ref(false)

  if (typeof my !== 'undefined' && my.getEnv) {
    my.getEnv((res) => {
      isInMiniProgram.value = !!res.miniprogram
    })
  } else {
    const ua = window.navigator.userAgent.toLowerCase()
    isInMiniProgram.value = ua.includes('miniprogram')
  }

  return { isInMiniProgram }
}

// Main bridge composable
export function useVodaPayBridge() {
  const bridgeReady = ref(false)
  const error = ref(null)

  // Initialise the bridge
  function initBridge() {
    if (typeof my === 'undefined') {
      console.warn('[Bridge] `my` is not available — running outside VodaPay')
      bridgeReady.value = true // Allow app to run in standalone mode
      return
    }

    // Register the global message handler.
    my.onMessage = function (message) {
      console.log('[Bridge] Received from Mini Program:', message)
      const { type, data } = message

      // Dispatch to registered listeners for this message type
      if (messageListeners.has(type)) {
        messageListeners.get(type).forEach((cb) => cb(data))
      }

      if (messageListeners.has('*')) {
        messageListeners.get('*').forEach((cb) => cb({ type, data }))
      }
    }

    bridgeReady.value = true

    // ALERT: Confirm bridge is live before sending BRIDGE_READY
    window.alert(
      '🔗 Bridge Initialised\n\n' +
      'my.onMessage is now registered.\n\n' +
      'H5 -> Mini Program\n' +
      'Sending: BRIDGE_READY\n\n' +
      'The Mini Program will respond with MINI_PROGRAM_CONTEXT' 
    )

    // Signal to the Mini Program that the H5 is ready.
    setTimeout(() => {
      console.log('[Bridge] Sending BRIDGE_READY to Mini Program')
      sendToMiniProgram('BRIDGE_READY', { timestamp: Date.now() })
    }, 1500);
  }

  // Send a message TO the Mini Program
  function sendToMiniProgram(action, payload = {}) {
    if (typeof my === 'undefined') {
      console.warn('[Bridge] Cannot send — not in mini program:', action, payload)
      return
    }
    window.alert('[Bridge] Sending to Mini Program: \n\n' + action + '\n\n' + JSON.stringify(payload))
    my.postMessage({ action, payload })
  }

  // Subscribe to messages FROM the Mini Program
  function onMessage(type, callback) {
    if (!messageListeners.has(type)) {
      messageListeners.set(type, new Set())
    }
    messageListeners.get(type).add(callback)

    // Return cleanup function
    return () => {
      if (messageListeners.has(type)) {
        messageListeners.get(type).delete(callback)
      }
    }
  }

  // Sends an action and resolves when a specific response type arrives.
  function requestFromMiniProgram(sendAction, receiveType, failType, payload = {}) {
    return new Promise((resolve, reject) => {
      const unsubSuccess = onMessage(receiveType, (data) => {
        unsubSuccess()
        unsubFail()
        resolve(data)
      })
      const unsubFail = onMessage(failType, (data) => {
        unsubSuccess()
        unsubFail()
        reject(data)
      })
      sendToMiniProgram(sendAction, payload)
    })
  }

  return {
    bridgeReady,
    error,
    initBridge,
    sendToMiniProgram,
    onMessage,
    requestFromMiniProgram,
  }
}