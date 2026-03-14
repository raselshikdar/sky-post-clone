import { useEffect } from 'react'; // 'import' ছোট হাতের করে ঠিক করা হয়েছে

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

        let finalColor = '#ffffff';
        if (isDark) {
          finalColor = isAmoled ? '#000000' : '#19212c';
        }

        await StatusBar.setBackgroundColor({ color: finalColor });
        await StatusBar.setStyle({ 
          style: isDark ? 'LIGHT' : 'DARK' 
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
