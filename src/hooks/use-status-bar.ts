import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const updateSystemBars = async () => {
      try {
        // ১. ওয়েবসাইটের বডি থেকে বর্তমান ব্যাকগ্রাউন্ড কালারটি নেওয়া (Light/Dim/Amoled সবার জন্য)
        const bgColor = getComputedStyle(document.body).backgroundColor;

        // ২. ডার্ক মোড চেক করা (আইকন কালার ঠিক করার জন্য)
        const isDark = document.documentElement.classList.contains('dark') || theme === 'dark';

        // ৩. ওপরের স্ট্যাটাস বার সেট করা
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: bgColor });
        // ডার্ক মোডে সাদা আইকন (Style.Dark) আর লাইট মোডে কালো আইকন (Style.Light)
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        // ৪. নিচের নেভিগেশন বার সেট করা
        await NavigationBar.setColor({ 
          color: bgColor, 
          darkButtons: !isDark // লাইট মোডে বাটন কালো, ডার্ক মোডে সাদা হবে
        });
      } catch (e) {
        console.warn('System bars update failed');
      }
    };

    // থিম ট্রানজিশন শেষ হওয়ার জন্য ৩০০ মিলি-সেকেন্ড অপেক্ষা করা
    const timer = setTimeout(updateSystemBars, 300);
    return () => clearTimeout(timer);
  }, [theme]);
};
