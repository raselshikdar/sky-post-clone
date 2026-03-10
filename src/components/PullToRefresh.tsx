import { useEffect, useRef } from 'react';

export const PullToRefresh = () => {
  const touchStart = useRef<number>(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => { 
      touchStart.current = e.touches[0].pageY; 
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEnd = e.changedTouches[0].pageY;
      const distance = touchEnd - touchStart.current;

      // শুধুমাত্র স্ক্রিনের একদম উপরে (window.scrollY === 0) থাকলে কাজ করবে
      // দূরত্ব ১৫০ পিক্সেলের বেশি হতে হবে
      if (window.scrollY <= 0 && distance > 150) {
        // অল্প ভাইব্রেশন দিয়ে ইউজারকে ফিডব্যাক দেওয়া (অপশনাল)
        if ('vibrate' in navigator) navigator.vibrate(50);
        window.location.reload();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return null;
};
