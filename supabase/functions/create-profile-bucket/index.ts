import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Try creating bucket
  const { error: bucketError } = await supabase.storage.createBucket("profiles", {
    public: true,
  });

  const bucketOk = !bucketError || bucketError.message?.includes("already exists");

  return new Response(JSON.stringify({ success: bucketOk, error: bucketError?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
