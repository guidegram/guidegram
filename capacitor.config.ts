import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.guidegram.app',
  appName: 'Guidegram',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0d14',
    buildOptions: {
      keystorePath: undefined,
      releaseType: 'APK',
    },
  },
}

export default config
