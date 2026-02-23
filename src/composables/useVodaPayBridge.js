// src/composables/useVodaPayBridge.js
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  VodaPay Bridge Composable                                   ║
// ║                                                              ║
// ║  This is the CENTRAL communication hub of the H5 app.       ║
// ║  It wraps the `my` global object (injected by bridge.js)    ║
// ║  and provides a clean, reactive Vue interface.               ║
// ║                                                              ║
// ║  Two-way communication protocol:                             ║
// ║                                                              ║
// ║  H5 → Mini Program:                                          ║
// ║    sendToMiniProgram(action, payload)                        ║
// ║    → calls my.postMessage({ action, payload })               ║
// ║                                                              ║
// ║  Mini Program → H5:                                          ║
// ║    my.onMessage = fn  (set once in initBridge)               ║
// ║    → emits events that components subscribe to              ║
// ╚══════════════════════════════════════════════════════════════╝

import { ref, onMounted, onUnmounted } from 'vue'

// ── Event bus for Mini Program → H5 messages ──────────────────
// Simple pattern: listeners keyed by message type
const messageListeners = new Map()

// ── Detect if running inside VodaPay WebView ──────────────────
// Checks UserAgent for 'miniprogram' string (injected by VodaPay container)
export function useIsInMiniProgram() {
  const isInMiniProgram = ref(false)

  // my.getEnv is the official way — falls back to UA sniffing
  if (typeof my !== 'undefined' && my.getEnv) {
    my.getEnv((res) => {
      isInMiniProgram.value = !!res.miniprogram
    })
  } else {
    // Fallback: UserAgent detection
    const ua = window.navigator.userAgent.toLowerCase()
    isInMiniProgram.value = ua.includes('miniprogram')
  }

  return { isInMiniProgram }
}

// ── Main bridge composable ─────────────────────────────────────
export function useVodaPayBridge() {
  const bridgeReady = ref(false)
  const error = ref(null)

  // ── Initialise the bridge ──────────────────────────────────
  // Should be called ONCE at the app root (App.vue onMounted).
  // Sets up my.onMessage to receive all messages from the Mini Program.
  function initBridge() {
    if (typeof my === 'undefined') {
      console.warn('[Bridge] `my` is not available — running outside VodaPay')
      bridgeReady.value = true // Allow app to run in standalone mode
      return
    }

    // ✅ Register the global message handler.
    // ALL messages from the Mini Program arrive here.
    // The Mini Program sends them via: webViewContext.postMessage({ type, data })
    my.onMessage = function (message) {
      console.log('[Bridge] Received from Mini Program:', message)
      const { type, data } = message

      // Dispatch to registered listeners for this message type
      if (messageListeners.has(type)) {
        messageListeners.get(type).forEach((cb) => cb(data))
      }

      // Also dispatch to wildcard listeners (useful for logging/debugging)
      if (messageListeners.has('*')) {
        messageListeners.get('*').forEach((cb) => cb({ type, data }))
      }
    }

    bridgeReady.value = true

    // ✅ ALERT: Confirm bridge is live before sending BRIDGE_READY
    window.alert(
      '🔗 Bridge Initialised\n\n' +
      'my.onMessage is now registered.\n\n' +
      '📨 H5 → Mini Program\n' +
      'Sending: BRIDGE_READY\n\n' +
      'The Mini Program will respond with MINI_PROGRAM_CONTEXT\n' +
      'containing the pre-loaded mock user (Thabo Nkosi).'
    )

    // ✅ Signal to the Mini Program that the H5 is ready.
    sendToMiniProgram('BRIDGE_READY', { timestamp: Date.now() })
    console.log('[Bridge] Initialised and signalled ready')
  }

  // ── Send a message TO the Mini Program ────────────────────
  // Format: { action: 'ACTION_NAME', payload: { ...data } }
  // The Mini Program receives this in its handleH5Message() handler.
  function sendToMiniProgram(action, payload = {}) {
    if (typeof my === 'undefined') {
      console.warn('[Bridge] Cannot send — not in mini program:', action, payload)
      return
    }
    console.log('[Bridge] Sending to Mini Program:', action, payload)
    // ✅ This is the core H5 → Mini Program send method
    my.postMessage({ action, payload })
  }

  // ── Subscribe to messages FROM the Mini Program ───────────
  // Returns an unsubscribe function.
  // Usage: const unsub = onMessage('AUTH_CODE_SUCCESS', (data) => { ... })
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

  // ── Convenience: one-shot promise-based message ────────────
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