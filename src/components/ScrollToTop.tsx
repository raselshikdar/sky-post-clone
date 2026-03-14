import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // ব্রাউজারে পেজ পেইন্ট হওয়ার ঠিক আগেই এটি স্ক্রল পজিশন রিসেট করে দেবে
    window.scrollTo(0, 0); 
  }, [pathname]);

  return null;
}
