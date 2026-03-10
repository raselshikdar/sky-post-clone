import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

export const useStatusBar = (theme: string | undefined) => {
  useEffect(() => {
    const updateSystemBars = async () => {
      try {
        // ১. ডার্ক মোড চেক করা
        const isDark = document.documentElement.classList.contains('dark') || theme === 'dark';
        
        // ২. আপনার সাইটের ডার্ক কালার (Amoled/Dim এর মাঝামাঝি একটি ডার্ক কালার)
        const darkColor = '#0f172a'; // আপনার সাইটের কালারের সাথে সামঞ্জস্যপূর্ণ
        const lightColor = '#ffffff';
        const finalColor = isDark ? darkColor : lightColor;

        // ৩. ওপরের স্ট্যাটাস বার ফিক্স
        // overlay: false মানে কন্টেন্ট বারের নিচে যাবে না, সময়/ব্যাটারি স্পষ্ট দেখা যাবে
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: finalColor });
        
        // আইকন কালার: ডার্ক মোডে সাদা আইকন (Style.Dark), লাইট মোডে কালো (Style.Light)
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

        // ৪. নিচের নেভিগেশন বার ফিক্স
        await NavigationBar.setColor({ 
          color: finalColor, 
          darkButtons: !isDark 
        });

      } catch (e) {
        console.warn('System bar update failed');
      }
    };

    updateSystemBars();
    // থিম পরিবর্তনের জন্য একটু সময় দিয়ে আবার চেক করা
    const timer = setTimeout(updateSystemBars, 500);
    return () => clearTimeout(timer);
  }, [theme]);
};
