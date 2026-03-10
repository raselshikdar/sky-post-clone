import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const syncSystemBars = async () => {
      try {
        const html = document.documentElement;
        // থিম প্রোভাইডার সাধারণত html ক্লাসে 'dark' যোগ করে 
        // এবং এমুলেড এর জন্য 'data-dark-theme' বা সরাসরি বডিতে ক্লাস দেয়
        const isDark = html.classList.contains('dark');
        const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

        // আপনার index.css এর HSL টোকেন থেকে প্রাপ্ত হুবহু Hex কালার
        let finalColor = '#ffffff'; // Light

        if (isDark) {
          if (isAmoled) {
            finalColor = '#000000'; // AMOLED (0 0% 0%)
          } else {
            finalColor = '#15202b'; // Dim (220 30% 14%) - Twitter style dim
          }
        }

        // ওপরের স্ট্যাটাস বার আপডেট
        await StatusBar.setBackgroundColor({ color: finalColor });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        // নিচের নেভিগেশন বার (এখন আর ফোনের ডিফল্ট থিমে আটকে থাকবে না)
        await NavigationBar.setColor({ 
          color: finalColor, 
          darkButtons: !isDark // লাইট মোডে বাটন কালো, ডার্ক মোডে সেই স্ট্যান্ডার্ড ছাই রঙ
        });

      } catch (e) {
        console.warn('System bar sync failed');
      }
    };

    // আপনার থিম প্রোভাইডারের ট্রানজিশন শেষ হওয়ার জন্য অপেক্ষা করা
    syncSystemBars();
    const observer = new MutationObserver(syncSystemBars);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-dark-theme'] });

    return () => observer.disconnect();
  }, [theme]);
};
