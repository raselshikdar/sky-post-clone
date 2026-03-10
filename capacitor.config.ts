import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.sky.post.clone', // আপনার অ্যাপ আইডি
  appName: 'Awaj',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // এই অংশটি নেভিগেশন বারকে পারমিশন দিবে
    NavigationBar: {
      enable: true
    }
  }
};

export default config;
