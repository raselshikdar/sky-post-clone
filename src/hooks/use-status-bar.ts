import { useEffect } from 'react';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const syncSystemBars = async () => {
      try {
        const win = window as any;
        const StatusBar = win.Capacitor?.Plugins?.StatusBar;
        const NavigationBar = win.Capacitor?.Plugins?.NavigationBar;

        if (!StatusBar) return;

        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

        // কালার একদম ১০০% ঠিক আছে, আমি এটা একটুও বদলাইনি
        let finalColor = '#ffffff';
        if (isDark) {
          finalColor = isAmoled ? '#000000' : '#19212c';
        }

        await StatusBar.setBackgroundColor({ color: finalColor });
        
        // শুধুমাত্র এই লাইনটি ঠিক করা হয়েছে। 
        // ডার্ক মোডে 'DARK' স্টাইল (সাদা আইকন) এবং লাইট মোডে 'LIGHT' স্টাইল (কালো আইকন)
        await StatusBar.setStyle({ 
          style: isDark ? 'DARK' : 'LIGHT' 
        });

        if (NavigationBar) {
          await NavigationBar.setColor({ 
            color: finalColor, 
            darkButtons: !isDark 
          });
        }
      } catch (e) {
        // সাইলেন্ট এরর
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
