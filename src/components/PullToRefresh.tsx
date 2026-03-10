import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const startY = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    // টাচ শুরু হওয়ার পজিশন সেভ করা
    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].pageY;
    };

    // আঙুল ছাড়ার সময় দূরত্ব চেক করা
    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].pageY;
      const distance = endY - startY.current;

      // স্ক্রিন একদম ওপরে থাকলে এবং ২৫০ পিক্সেলের বেশি নিচে টানলে
      // আমরা document.documentElement.scrollTop এবং window.pageYOffset দুটোই চেক করছি
      const isTop = (window.pageYOffset || document.documentElement.scrollTop) <= 0;

      if (isTop && distance > 250) {
        // ভাইব্রেশন কনফার্মেশন
        if ('vibrate' in navigator) {
          navigator.vibrate(60);
        }

        // আপনার অ্যাপের সব ডাটা রিফ্রেশ করবে
        queryClient.invalidateQueries();
        
        // যদি এটি কাজ না করে, তবে নিচের রিলোড কমান্ডটি দিন (এটি ১০০% কাজ করবে)
        // window.location.reload();
      }
      
      // মান রিসেট
      startY.current = 0;
    };

    // সরাসরি বডিতে লিসেনার যোগ করা
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queryClient]);

  return null;
};
