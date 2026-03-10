import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cc.eu.awaj',
  appName: 'Awaj',
  webDir: 'dist',
  server: {
    androidScheme: 'https' // এটি যোগ করুন
  }
};

export default config;
