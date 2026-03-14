import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user || !isSupported) return;
    checkSubscription();
  }, [user, isSupported]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        "get-vapid-public-key"
      );
      if (vapidError || !vapidData?.publicKey) {
        throw new Error("Failed to get VAPID key");
      }

      const publicKey = urlBase64ToUint8Array(vapidData.publicKey);

      // Subscribe via Push API
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey.buffer as ArrayBuffer,
      });

      const subscriptionJSON = subscription.toJSON();

      // Store subscription in database
      await (supabase as any).from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh: subscriptionJSON.keys!.p256dh!,
          auth: subscriptionJSON.keys!.auth!,
        },
        { onConflict: "user_id,endpoint" }
      );

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      setLoading(false);
      return false;
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await (supabase as any)
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
    }
    setLoading(false);
  }, [user]);

  return { isSubscribed, isSupported, permission, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
