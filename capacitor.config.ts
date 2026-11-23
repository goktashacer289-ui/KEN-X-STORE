import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kenix.store',
  appName: 'KENİX STORE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // When building a standalone APK pointing to your hosted Cloud Run/production backend:
    // url: 'https://your-kenix-store-url.run.app',
    cleartext: false
  },
  android: {
    backgroundColor: '#03081c',
    allowMixedContent: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#03081c',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
