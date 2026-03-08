import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GIPHY_API_KEY = Deno.env.get("GIPHY_API_KEY");
  if (!GIPHY_API_KEY) {
    return new Response(JSON.stringify({ error: "GIPHY_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, offset = 0, limit = 20 } = await req.json();

    const endpoint = query?.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg-13&lang=en`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=pg-13`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`GIPHY API error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();

    const gifs = data.data.map((g: any) => ({
      id: g.id,
      title: g.title,
      preview: g.images.fixed_width_small.url,
      url: g.images.fixed_height.url,
      original: g.images.original.url,
      width: parseInt(g.images.fixed_height.width),
      height: parseInt(g.images.fixed_height.height),
    }));

    return new Response(JSON.stringify({ gifs, total: data.pagination.total_count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GIPHY search error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
