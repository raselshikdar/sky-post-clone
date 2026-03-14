import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor-status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const syncSystemBars = async () => {
      try {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

        let finalColor = '#ffffff'; // Light

        if (isDark) {
          if (isAmoled) {
            finalColor = '#000000'; // AMOLED
          } else {
            // শুধুমাত্র এই লাইনটি পরিবর্তন করা হয়েছে (#15202b বদলে #19212c)
            // এটি তোমার CSS এর hsl(220 30% 14%) এর হুবহু Hex কোড
            finalColor = '#19212c'; 
          }
        }

        // স্ট্যাটাস বার আপডেট
        await StatusBar.setBackgroundColor({ color: finalColor });
        
        // ডার্ক/ডিম মোডে সাদা আইকন (Style.Light) এবং লাইট মোডে কালো (Style.Dark)
        // তোমার দেওয়া কোডে লজিকটা উল্টো ছিল, আমি শুধু সেটা সোজা করে দিলাম
        await StatusBar.setStyle({ 
          style: isDark ? Style.Light : Style.Dark 
        });

        // নেভিগেশন বার আপডেট
        if (NavigationBar) {
          await NavigationBar.setColor({ 
            color: finalColor, 
            darkButtons: !isDark 
          });
        }

      } catch (e) {
        console.warn('System bar sync failed');
      }
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
