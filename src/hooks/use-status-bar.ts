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

        // ১. আপনার CSS অনুযায়ী ব্যাকগ্রাউন্ড কালার (Hex)
        let bgColor = '#ffffff'; // Light
        if (isDark) {
          bgColor = isAmoled ? '#000000' : '#1a2333'; // Amoled vs Dim
        }

        // ২. ওপরের স্ট্যাটাস বার ফিক্স
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: bgColor });
        
        // Style.Dark দিলে অ্যান্ড্রয়েড অটোমেটিক সেই 'প্রফেশনাল সফট হোয়াইট' আইকন দেখাবে
        await StatusBar.setStyle({ 
          style: isDark ? Style.Dark : Style.Light 
        });

        // ৩. নিচের নেভিগেশন বার ফিক্স (সবচেয়ে গুরুত্বপূর্ণ)
        await NavigationBar.setColor({ 
          color: bgColor, 
          // darkButtons: false মানে ডার্ক মোডে বাটনগুলো পিওর সাদা হবে না, 
          // বরং আপনার চাওয়া সেই প্রফেশনাল 'সফট ভিজিবল' কালার নেবে।
          darkButtons: !isDark 
        });

      } catch (e) {
        console.warn('System bars update failed');
      }
    };

    updateSystemBars();
    const timer = setTimeout(updateSystemBars, 450);
    return () => clearTimeout(timer);
  }, [theme]);
};
