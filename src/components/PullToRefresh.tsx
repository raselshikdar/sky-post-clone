import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const startY = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].pageY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].pageY;
      const distance = endY - startY.current;

      // যদি স্ক্রিন একদম ওপরে থাকে এবং ১০০ পিক্সেলের বেশি নিচে টানা হয়
      if (window.scrollY === 0 && distance > 150) {
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        // এটি আপনার সাইটের ডাটা রিফ্রেশ করবে
        queryClient.invalidateQueries();
        
        // যদি ডাটা রিফ্রেশ না হয়, তবে এই লাইনটি ব্যবহার করবেন:
        // window.location.reload();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queryClient]);

  return null;
};
