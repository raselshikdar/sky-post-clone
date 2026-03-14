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

        // আপনার index.css এর HSL টোকেন অনুযায়ী হুবহু Hex কালার
        let finalColor = '#ffffff'; // Light

        if (isDark) {
          if (isAmoled) {
            finalColor = '#000000'; // AMOLED
          } else {
            // ডিম মোডের সেই সামান্য পার্থক্য দূর করার জন্য সঠিক কোড
            finalColor = '#19212c'; 
          }
        }

        // ওপরের স্ট্যাটাস বার আপডেট
        await StatusBar.setBackgroundColor({ color: finalColor });
        
        // ডার্ক বা ডিম মোডে আইকন হবে সাদা (Style.Light)
        // লাইট মোডে আইকন হবে কালো (Style.Dark)
        await StatusBar.setStyle({ 
          style: isDark ? Style.Light : Style.Dark 
        });

        // নিচের নেভিগেশন বার আপডেট
        await NavigationBar.setColor({ 
          color: finalColor, 
          darkButtons: !isDark 
        });

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
