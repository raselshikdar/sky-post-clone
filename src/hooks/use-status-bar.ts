import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const syncSystemBars = async () => {
      try {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

        // আপনার index.css অনুযায়ী নিখুঁত কালার সিলেকশন
        let finalColor = '#ffffff'; // ডিফল্ট লাইট মোড (hsl: 0 0% 100%)

        if (isDark) {
          if (isAmoled) {
            finalColor = '#000000'; // AMOLED (hsl: 0 0% 0%)
          } else {
            // Dim Mode: hsl(220 30% 14%) -> #19212c (আপনার CSS অনুযায়ী সঠিক কোড)
            finalColor = '#19212c'; 
          }
        }

        // ১. ওপরের স্ট্যাটাস বার আপডেট
        await StatusBar.setBackgroundColor({ color: finalColor });
        
        // ডার্ক বা ডিম মোডে স্টাইল হবে Style.Light (যাতে আইকন/টেক্সট সাদা দেখায়)
        // লাইট মোডে স্টাইল হবে Style.Dark (যাতে আইকন/টেক্সট কালো দেখায়)
        await StatusBar.setStyle({ 
          style: isDark ? Style.Light : Style.Dark 
        });

        // ২. নিচের নেভিগেশন বার আপডেট (আপনার ফোনের নিচের বোতামের এরিয়া)
        await NavigationBar.setColor({ 
          color: finalColor, 
          darkButtons: !isDark // লাইট মোডে বাটন কালো, ডার্ক/ডিম মোডে সাদা
        });

      } catch (e) {
        console.warn('System bar sync failed', e);
      }
    };

    // প্রথমবার রান করা
    syncSystemBars();

    // থিম পরিবর্তন হলে অটোমেটিক ধরার জন্য অবজার্ভার
    const observer = new MutationObserver(syncSystemBars);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-dark-theme'] 
    });

    return () => observer.disconnect();
  }, [theme]);
};
