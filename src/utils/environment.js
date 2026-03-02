
export function detectEnvironment() {
  const env = {
    isBrowser: false,
    isMiniProgram: false,
    isVodaPayWebView: false,
    isSimulator: false,
    isRealDevice: false,
    isStandalone: false,
    platform: 'unknown',
    userAgent: navigator.userAgent || '',
    hasMyObject: false
  };
 
  // 1. Check for my object
  env.hasMyObject = typeof window.my !== 'undefined' && window.my !== null;
 
  // 2. Check user agent string
  const ua = (navigator.userAgent || '').toLowerCase();
 
  if (ua.includes('miniprogram') || ua.includes('vodapay') || ua.includes('alipayclient')) {
    env.isMiniProgram = true;
    env.platform = 'VodaPayMiniProgram';
  }
 
  // 3. VodaPay-specific detection using my.getEnv if available
  if (env.hasMyObject && typeof my.getEnv === 'function') {
    env.isVodaPayWebView = true;
    env.isMiniProgram = true;
 
    // Optional: get more precise info (most likely to work in a real env??)
    try {
      my.getEnv((res) => {
        env.isRealDevice = !!res.miniprogram;
        env.isSimulator = !res.miniprogram;
      });
    } catch (e) {
      console.warn('getEnv failed — likely simulator or restricted context');
    }
  }
 
  // 4. Fallback: no object or not a mini program
  if (!env.isMiniProgram && !env.hasMyObject) {
    env.isStandalone = true;
    env.isBrowser = true;
    env.platform = 'StandaloneBrowser';
  }
 
  // 5. Quick flags for common use cases
  env.isDevelopment = import.meta.env.DEV;
  env.isProduction = import.meta.env.PROD;
 
  return env;
}

export function useEnvironment(){
    const environment = ref(detectEnvironment());
    return environment; 
}