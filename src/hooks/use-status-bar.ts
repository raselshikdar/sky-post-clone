import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const updateSystemBars = async () => {
      try {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

        let finalColor = '#ffffff'; // Light

        if (isDark) {
          if (isAmoled) {
            finalColor = '#000000'; // AMOLED (পিওর ব্ল্যাক)
          } else {
            finalColor = '#1a2333'; // Dim (আপনার CSS এর hsl(220 30% 14%))
          }
        }

        // ১. ওপরের বার
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: finalColor });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        // ২. নিচের নেভিগেশন বার (এখন এটি কাজ করতে বাধ্য)
        await NavigationBar.setColor({ 
          color: finalColor, 
          darkButtons: !isDark 
        });

      } catch (e) {
        console.warn('System bars configuration failed');
      }
    };

    updateSystemBars();
    const timer = setTimeout(updateSystemBars, 500);
    return () => clearTimeout(timer);
  }, [theme]);
};
