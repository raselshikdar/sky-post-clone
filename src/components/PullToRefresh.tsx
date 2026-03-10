import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const touchStart = useRef<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStart = (e: TouchEvent) => {
      // শুধু স্ক্রিনের একদম ওপর থেকে টানলে কাজ শুরু হবে
      if (window.scrollY <= 0) {
        touchStart.current = e.touches[0].pageY;
      }
    };

    const handleEnd = (e: TouchEvent) => {
      const touchEnd = e.changedTouches[0].pageY;
      const distance = touchEnd - touchStart.current;

      // distance ২৫০ পিক্সেল করা হলো যাতে ভুলবশত রিফ্রেশ না হয়। 
      // ইউজারকে সচেতনভাবে অনেকটা নিচে টানতে হবে।
      if (window.scrollY <= 0 && distance > 250) {
        if ('vibrate' in navigator) {
          navigator.vibrate(60); // একটু কড়া ভাইব্রেশন যাতে রিফ্রেশ বোঝা যায়
        }
        
        // পেজ রিলোড না করে শুধু ডাটা আপডেট করবে
        queryClient.invalidateQueries();
      }
      
      // রিসেট
      touchStart.current = 0;
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
