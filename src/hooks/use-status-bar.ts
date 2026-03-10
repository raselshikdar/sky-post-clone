import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';

export const useStatusBar = () => {
  useEffect(() => {
    const setupStatusBar = async () => {
      try {
        // স্ট্যাটাস বারকে অ্যাপের কন্টেন্টের ওপর ওভারলে করবে (ফেসবুকের মতো লুক)
        await StatusBar.setOverlaysWebView({ overlay: true });
        
        // আইকনের স্টাইল (ডার্ক মোডে সাদা আইকন এবং লাইট মোডে কালো আইকন দেখাবে)
        await StatusBar.setStyle({ style: Style.Default });
      } catch (e) {
        console.warn('Status bar not available on this platform');
      }
    };

    setupStatusBar();
  }, []);
};
