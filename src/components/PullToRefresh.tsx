import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let startY = 0;
    
    const s = (e: TouchEvent) => { 
      startY = e.touches[0].pageY; 
    };

    const f = (e: TouchEvent) => {
      const d = e.changedTouches[0].pageY - startY;
      
      // window.scrollY চেক করার পাশাপাশি document.documentElement.scrollTop চেক করা নিরাপদ
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

      if (currentScroll <= 5 && d > 200) {
        if ('vibrate' in navigator) navigator.vibrate(50);
        
        // শুধু ডাটা রিফ্রেশ
        queryClient.invalidateQueries();
      }
    };

    // { passive: true } যোগ করা হয়েছে যাতে ব্রাউজার ইভেন্টটিকে ব্লক না করে
    document.addEventListener('touchstart', s, { passive: true });
    document.addEventListener('touchend', f, { passive: true });

    return () => {
      document.removeEventListener('touchstart', s);
      document.removeEventListener('touchend', f);
    };
  }, [queryClient]);

  return null;
};
