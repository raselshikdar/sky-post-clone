import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const applyColors = async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark');
        const isAmoled = document.documentElement.getAttribute('data-dark-theme') === 'dark';

        let targetColor = '#ffffff'; // লাইট
        if (isDark) {
          targetColor = isAmoled ? '#000000' : '#15202B'; // এমুলেড বনাম ডিম
        }

        // ওপরের বার
        await StatusBar.setBackgroundColor({ color: targetColor });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        // নিচের নেভিগেশন বার - ফোর্স মোড
        await NavigationBar.setColor({ 
          color: targetColor, 
          darkButtons: !isDark 
        });
      } catch (e) {
        console.error("Navigation Bar Error:", e);
      }
    };

    applyColors();
    // থিম পরিবর্তনের জন্য ব্যাকআপ রান
    const timer = setTimeout(applyColors, 500);
    return () => clearTimeout(timer);
  }, [theme]);
};
