import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      type,
      user_id,
      actor_id,
      notification_type,
      post_id,
      sender_id,
      content,
      conversation_id,
    } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get VAPID keys
    const { data: vapidKeys } = await supabaseAdmin
      .from("push_vapid_keys")
      .select("*")
      .limit(1)
      .single();

    if (!vapidKeys) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user's notification settings for push preference
    if (type === "notification" && notification_type) {
      const settingsKey = mapNotificationType(notification_type);
      const { data: settings } = await supabaseAdmin
        .from("notification_settings")
        .select("push")
        .eq("user_id", user_id)
        .eq("notification_type", settingsKey)
        .single();

      if (settings && !settings.push) {
        return new Response(
          JSON.stringify({ message: "Push disabled for this type" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build notification payload
    let title = "Awaj";
    let notifBody = "";
    let url = "/";
    let tag = "";

    if (type === "notification") {
      const { data: actor } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username")
        .eq("id", actor_id)
        .single();

      const actorName = actor?.display_name || actor?.username || "Someone";

      switch (notification_type) {
        case "like":
          title = "New Like";
          notifBody = `${actorName} liked your post`;
          url = post_id ? `/post/${post_id}` : "/notifications";
          tag = `like-${post_id}`;
          break;
        case "follow":
          title = "New Follower";
          notifBody = `${actorName} followed you`;
          url = `/profile/${actor?.username}`;
          tag = `follow-${actor_id}`;
          break;
        case "reply":
          title = "New Reply";
          notifBody = `${actorName} replied to your post`;
          url = post_id ? `/post/${post_id}` : "/notifications";
          tag = `reply-${post_id}`;
          break;
        case "mention":
          title = "New Mention";
          notifBody = `${actorName} mentioned you`;
          url = post_id ? `/post/${post_id}` : "/notifications";
          tag = `mention-${post_id}`;
          break;
        case "repost":
          title = "New Repost";
          notifBody = `${actorName} reposted your post`;
          url = post_id ? `/post/${post_id}` : "/notifications";
          tag = `repost-${post_id}`;
          break;
        case "quote":
          title = "New Quote";
          notifBody = `${actorName} quoted your post`;
          url = post_id ? `/post/${post_id}` : "/notifications";
          tag = `quote-${post_id}`;
          break;
        default:
          title = "New Notification";
          notifBody = `${actorName} interacted with your content`;
          url = "/notifications";
          tag = `notif-${Date.now()}`;
      }
    } else if (type === "message") {
      const { data: senderProfile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username")
        .eq("id", sender_id)
        .single();

      title = senderProfile?.display_name || "New Message";
      notifBody = content || "Sent you a message";
      url = `/messages/${conversation_id}`;
      tag = `msg-${conversation_id}`;
    }

    const payload = JSON.stringify({ title, body: notifBody, url, tag });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          vapidKeys
        )
      )
    );

    // Clean up expired/gone subscriptions
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (
        result.status === "rejected" &&
        (result.reason?.statusCode === 410 ||
          result.reason?.statusCode === 404)
      ) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", (subscriptions[i] as any).id);
      }
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function mapNotificationType(type: string): string {
  const map: Record<string, string> = {
    like: "likes",
    follow: "follows",
    reply: "replies",
    mention: "mentions",
    repost: "reposts",
    quote: "quotes",
  };
  return map[type] || "activity";
}

// ─── Web Push Protocol Implementation (RFC 8291 + VAPID) ───

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidKeys: { public_key: string; private_key: string; subject: string }
) {
  const payloadBytes = new TextEncoder().encode(payload);

  // Import VAPID private key from JWK
  const vapidPrivateJwk = JSON.parse(vapidKeys.private_key);
  const vapidPrivateKey = await crypto.subtle.importKey(
    "jwk",
    vapidPrivateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Create VAPID JWT
  const audience = new URL(subscription.endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const jwtHeader = base64urlEncodeStr(
    JSON.stringify({ typ: "JWT", alg: "ES256" })
  );
  const jwtPayload = base64urlEncodeStr(
    JSON.stringify({ aud: audience, exp: expiration, sub: vapidKeys.subject })
  );
  const unsignedToken = `${jwtHeader}.${jwtPayload}`;

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    vapidPrivateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Deno returns P1363 format (r||s), which is what VAPID needs
  const jwt = `${unsignedToken}.${base64urlEncode(new Uint8Array(signatureBuffer))}`;

  // Encrypt payload using RFC 8291
  const encrypted = await encryptPayload(
    payloadBytes,
    base64urlDecode(subscription.keys.p256dh),
    base64urlDecode(subscription.keys.auth)
  );

  // Send to push service
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidKeys.public_key}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: encrypted,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    const error: any = new Error(
      `Push failed [${response.status}]: ${errBody}`
    );
    error.statusCode = response.status;
    throw error;
  }
}

async function encryptPayload(
  payload: Uint8Array,
  clientPublicKeyBytes: Uint8Array,
  authSecretBytes: Uint8Array
): Promise<Uint8Array> {
  // 1. Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // 2. Import client's public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // 4. Export local public key (uncompressed, 65 bytes)
  const localPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // 5. Derive IKM via HKDF
  // info = "WebPush: info\0" || ua_public || as_public
  const authInfo = concatBuffers(
    new TextEncoder().encode("WebPush: info\0"),
    clientPublicKeyBytes,
    localPublicKeyBytes
  );

  const sharedSecretKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const ikmBytes = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: authSecretBytes,
        info: authInfo,
      },
      sharedSecretKey,
      256
    )
  );

  // 6. Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 7. Derive CEK and nonce from IKM
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    ikmBytes,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cekBytes = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      ikmKey,
      128
    )
  );

  const nonceBytes = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      ikmKey,
      96
    )
  );

  // 8. Import CEK for AES-GCM
  const cek = await crypto.subtle.importKey(
    "raw",
    cekBytes,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  // 9. Pad plaintext (0x02 = last record delimiter)
  const paddedPayload = concatBuffers(payload, new Uint8Array([2]));

  // 10. Encrypt with AES-128-GCM
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBytes, tagLength: 128 },
      cek,
      paddedPayload
    )
  );

  // 11. Build aes128gcm header
  // salt (16) || rs (4, uint32 BE) || idlen (1) || keyid (65 = uncompressed P-256)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concatBuffers(
    salt,
    rs,
    new Uint8Array([65]),
    localPublicKeyBytes,
    encrypted
  );
}

// ─── Utility Functions ───

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}

function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlEncodeStr(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
