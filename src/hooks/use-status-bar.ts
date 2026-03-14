import { useEffect } from 'react';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const syncSystemBars = async () => {
      setTimeout(async () => {
        try {
          // নেটিভ প্লাগইনগুলোকে ডাইনামিকালি লোড করা হচ্ছে যাতে বিল্ড এরর না আসে
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          const { NavigationBar } = await import('@capgo/capacitor-navigation-bar');

          const html = document.documentElement;
          const isDark = html.classList.contains('dark');
          const isAmoled = html.getAttribute('data-dark-theme') === 'dark';

          let finalColor = '#ffffff';
          if (isDark) {
            finalColor = isAmoled ? '#000000' : '#19212c';
          }

          await StatusBar.setBackgroundColor({ color: finalColor });
          await StatusBar.setStyle({ 
            style: isDark ? Style.Light : Style.Dark 
          });

          if (NavigationBar) {
            await NavigationBar.setColor({ 
              color: finalColor, 
              darkButtons: !isDark 
            });
          }
        } catch (e) {
          console.warn('System bar sync failed or not on mobile');
        }
      }, 100);
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
