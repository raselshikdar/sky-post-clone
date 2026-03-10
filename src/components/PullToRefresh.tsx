import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const touchStart = useRef<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStart = (e: TouchEvent) => { touchStart.current = e.touches[0].pageY; };
    const handleEnd = (e: TouchEvent) => {
      const distance = e.changedTouches[0].pageY - touchStart.current;

      // দূরত্ব ২০০ পিক্সেলের বেশি হলে রিফ্রেশ হবে (যাতে ভুলবশত না হয়)
      if (window.scrollY <= 0 && distance > 200) {
        if ('vibrate' in navigator) navigator.vibrate(40);
        
        // পুরো পেজ রিলোড না করে শুধু ডাটা রিফ্রেশ করবে
        queryClient.invalidateQueries();
      }
    };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchend', handleEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [queryClient]);

  return null;
};
