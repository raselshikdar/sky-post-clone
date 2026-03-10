import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastTimeBackPress = useRef<number>(0);
  const timePeriodToExit = 2000;

  useEffect(() => {
    const addListener = async () => {
      const handler = await App.addListener('backButton', ({ canGoBack }) => {
        // হোম পেজ বা লগইন পেজে থাকলে অ্যাপ এক্সিট লজিক
        if (location.pathname === '/' || location.pathname === '/auth') {
          const currentTime = new Date().getTime();
          if (currentTime - lastTimeBackPress.current < timePeriodToExit) {
            App.exitApp();
          } else {
            lastTimeBackPress.current = currentTime;
            toast("Press back again to exit", {
              duration: 2000,
            });
          }
        } 
        // অন্য পেজে থাকলে ব্যাকে যাওয়া
        else {
          if (window.history.length > 1) {
            navigate(-1); // navigate(-1) বেশি নির্ভরযোগ্য
          } else {
            navigate('/', { replace: true });
          }
        }
      });

      return handler;
    };

    const handlerPromise = addListener();

    return () => {
      handlerPromise.then(h => h.remove());
    };
  }, [location, navigate]);
};
