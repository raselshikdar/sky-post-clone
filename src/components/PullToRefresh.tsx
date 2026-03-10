import { useEffect } from 'react';

export const PullToRefresh = () => {
  useEffect(() => {
    let touchStart = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStart = e.touches[0].pageY; };
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEnd = e.changedTouches[0].pageY;
      // স্ক্রিনের একদম উপর থেকে ১৫০ পিক্সেল টানলে রিলোড হবে
      if (window.scrollY === 0 && touchEnd - touchStart > 150) {
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
