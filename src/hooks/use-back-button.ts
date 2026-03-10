import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  let lastTimeBackPress = 0;
  const timePeriodToExit = 2000;

  useEffect(() => {
    const handler = App.addListener('backButton', ({ canGoBack }) => {
      // হোম পেজ বা অথ পেজে থাকলে এক্সিট লজিক
      if (location.pathname === '/' || location.pathname === '/auth') {
        if (new Date().getTime() - lastTimeBackPress < timePeriodToExit) {
          App.exitApp();
        } else {
          lastTimeBackPress = new Date().getTime();
          toast("Press back again to exit", {
            duration: 2000,
            position: "bottom-center",
          });
        }
      } else if (canGoBack) {
        window.history.back();
      } else {
        navigate('/', { replace: true });
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [location, navigate]);
};
