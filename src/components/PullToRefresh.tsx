import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const PullToRefresh = () => {
  const startY = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // এটি তখনই শুরু হবে যখন ইউজার স্ক্রিনের একদম ওপরে (window.scrollY === 0) থাকবে
      if (window.scrollY === 0) {
        startY.current = e.touches[0].pageY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].pageY;
      const distance = endY - startY.current;

      // ২৫০ পিক্সেল দূরত্ব—যা অনিচ্ছাকৃত রিফ্রেশ রোধ করবে
      if (window.scrollY === 0 && distance > 250) {
        // রিফ্রেশ সফল হলে একটি কনফার্মেশন ভাইব্রেশন দিবে
        if ('vibrate' in navigator) {
          navigator.vibrate(60); 
        }
        
        // শুধু ডাটা রিফ্রেশ করবে (পুরো পেজ রিলোড হবে না)
        queryClient.invalidateQueries();
        
        // যদি ডাটা আপডেট না হয়, তবে নিচের লাইনটি আনকমেন্ট করতে পারেন
        // window.location.reload();
      }
      
      // মান রিসেট করা
      startY.current = 0;
    };

    // Passive: false ব্যবহার করা হয়েছে যাতে স্ক্রল এবং রিফ্রেশ কনফ্লিক্ট না করে
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queryClient]);

  return null;
};
