import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const startY = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // আমরা সরাসরি টাচ পয়েন্ট ধরছি
      startY.current = e.touches[0].pageY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].pageY;
      const distance = endY - startY.current;

      // লজিক: যদি ইউজার ৩০০ পিক্সেল নিচে টানে 
      // এবং সে স্ক্রিনের একদম ওপরের দিকে থাকে (যেখানেই স্ক্রল থাকুক)
      if (distance > 300) {
        // রিফ্রেশ শুরু হওয়ার আগে ভাইব্রেশন কনফার্মেশন
        if ('vibrate' in navigator) {
          navigator.vibrate(80); // একটু কড়া ভাইব্রেশন
        }

        // ১. আপনার সাইটের ডাটা রিফ্রেশ করা (TanStack Query)
        queryClient.invalidateQueries();

        // ২. যদি ডাটা রিফ্রেশ না হয়, তবে জোর করে পেজ রিলোড করা (সবচেয়ে কার্যকর)
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      
      startY.current = 0;
    };

    // 'body' তে ইভেন্ট যোগ করছি এবং passive: false দিচ্ছি যাতে এটি সিএসএসকে ওভাররাইড করতে পারে
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.body.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queryClient]);

  return null;
};
