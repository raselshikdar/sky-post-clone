import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const setupSystemBars = async () => {
      try {
        const isDark = theme === 'dark';
        
        // ১. স্ট্যাটাস বার (ওপরের বার)
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: isDark ? '#000000' : '#ffffff' });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        // ২. নেভিগেশন বার (নিচের বার)
        // এটি আপনার ফোনের নিচের বাটন বা বার এর কালার পরিবর্তন করবে
        await NavigationBar.setColor({ color: isDark ? '#000000' : '#ffffff', darkButtons: !isDark });
      } catch (e) {
        console.warn('System bars configuration failed');
      }
    };

    setupSystemBars();
  }, [theme]);
};
