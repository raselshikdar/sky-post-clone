import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor-status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const syncSystemBars = async () => {
      // থিম পরিবর্তনের জন্য ২-৩ মিলি-সেকেন্ড সময় দিলে DOM সঠিকভাবে আপডেট হয়
      setTimeout(async () => {
        try {
          const html = document.documentElement;
          const isDark = html.classList.contains('dark');
          const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

          // ব্যাকগ্রাউন্ড কালার লজিক
          let finalColor = '#ffffff'; // Light
          if (isDark) {
            finalColor = isAmoled ? '#000000' : '#19212c'; // AMOLED vs Dim
          }

          // ১. স্ট্যাটাস বার ব্যাকগ্রাউন্ড এবং আইকন স্টাইল
          // অ্যান্ড্রয়েডে Style.Light মানে সাদা আইকন (ডার্ক থিমের জন্য)
          // এবং Style.Dark মানে কালো আইকন (লাইট থিমের জন্য)
          await StatusBar.setBackgroundColor({ color: finalColor });
          await StatusBar.setStyle({ 
            style: isDark ? Style.Light : Style.Dark 
          });

          // ২. নেভিগেশন বার আপডেট
          if (NavigationBar) {
            await NavigationBar.setColor({ 
              color: finalColor, 
              darkButtons: !isDark 
            });
          }
        } catch (e) {
          console.warn('System bar sync failed', e);
        }
      }, 50); // ছোট একটি ডিলে যাতে UI স্টেট কনফার্ম হয়
    };

    syncSystemBars();

    const observer = new MutationObserver(syncSystemBars);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-dark-theme'] 
    });

    return () => observer.disconnect();
  }, [theme]);
};
