import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.sky.post.clone',
  appName: 'Awaj',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
    // নেভিগেশন বারকে সিস্টেম থেকে অ্যাপের নিয়ন্ত্রণে আনা
    NavigationBar: {
      enable: true,
    }
  }
};

export default config;
