const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMeta(html: string, property: string): string | null {
  // Try og: and twitter: variants
  for (const prefix of [property, property.replace('og:', 'twitter:')]) {
    const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${prefix}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    if (match) return match[1];
    // Also try content before property
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${prefix}["']`, 'i');
    const match2 = html.match(regex2);
    if (match2) return match2[1];
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const match = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i);
  if (match) {
    const href = match[1];
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    try {
      return new URL(href, baseUrl).href;
    } catch { return null; }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `HTTP ${response.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only read first 50KB for performance
    const reader = response.body?.getReader();
    let html = '';
    const decoder = new TextDecoder();
    if (reader) {
      let bytes = 0;
      while (bytes < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytes += value.length;
      }
      reader.cancel();
    }

    const ogTitle = extractMeta(html, 'og:title') || extractTitle(html) || '';
    const ogDescription = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
    const ogImage = extractMeta(html, 'og:image') || '';
    const ogSiteName = extractMeta(html, 'og:site_name') || '';
    const favicon = extractFavicon(html, url);

    let domain = '';
    try { domain = new URL(url).hostname; } catch {}

    // Resolve relative og:image
    let imageUrl = ogImage;
    if (imageUrl && !imageUrl.startsWith('http')) {
      try { imageUrl = new URL(imageUrl, url).href; } catch {}
    }

    return new Response(JSON.stringify({
      title: ogTitle,
      description: ogDescription,
      image: imageUrl,
      site_name: ogSiteName || domain,
      domain,
      favicon: favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      url,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch preview';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
