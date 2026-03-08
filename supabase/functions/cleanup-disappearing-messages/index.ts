import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all conversations with disappearing messages enabled
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, disappear_after")
      .not("disappear_after", "is", null);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: "No conversations with disappearing messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalDeleted = 0;

    for (const conv of conversations) {
      const expiryTime = new Date(Date.now() - (conv.disappear_after * 1000)).toISOString();
      
      // Delete messages older than the disappear_after threshold
      const { data: deleted, error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conv.id)
        .lt("created_at", expiryTime)
        .select("id");

      if (deleteError) {
        console.error(`Error deleting messages for conversation ${conv.id}:`, deleteError);
        continue;
      }

      totalDeleted += deleted?.length || 0;
    }

    return new Response(
      JSON.stringify({ 
        deleted: totalDeleted, 
        conversations_processed: conversations.length,
        message: `Cleaned up ${totalDeleted} expired messages` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error cleaning up messages:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
