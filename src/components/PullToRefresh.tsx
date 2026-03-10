import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const startY = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStart = (e: TouchEvent) => { startY.current = e.touches[0].pageY; };
    const handleEnd = (e: TouchEvent) => {
      const dist = e.changedTouches[0].pageY - startY.current;
      // ২৫০ পিক্সেল ইনটেনশনাল সোয়াইপ
      if (window.scrollY <= 0 && dist > 250) {
        if ('vibrate' in navigator) navigator.vibrate(40);
        // শুধু ডাটা রিফ্রেশ করবে, পেজ সাদা হয়ে রিলোড হবে না
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
