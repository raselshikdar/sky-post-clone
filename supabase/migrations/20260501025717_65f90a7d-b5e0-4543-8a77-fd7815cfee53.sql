
-- ============================================================
-- INDEXES — speed up feed, follow, like, repost, quote lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_parent_created
  ON public.posts (created_at DESC) WHERE parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_author_parent_created
  ON public.posts (author_id, created_at DESC) WHERE parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_parent_id
  ON public.posts (parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_likes_post_user
  ON public.likes (post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_likes_user
  ON public.likes (user_id);

CREATE INDEX IF NOT EXISTS idx_reposts_post_user
  ON public.reposts (post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_reposts_user_created
  ON public.reposts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reposts_created
  ON public.reposts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower_following
  ON public.follows (follower_id, following_id);

CREATE INDEX IF NOT EXISTS idx_post_images_post_position
  ON public.post_images (post_id, position);

CREATE INDEX IF NOT EXISTS idx_hidden_posts_user
  ON public.hidden_posts (user_id);

CREATE INDEX IF NOT EXISTS idx_muted_threads_user
  ON public.muted_threads (user_id);

CREATE INDEX IF NOT EXISTS idx_muted_accounts_user
  ON public.muted_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_blocked_accounts_user
  ON public.blocked_accounts (user_id);


-- ============================================================
-- FUNCTION — get_home_feed
-- Single-call denormalized feed (Twitter / Bluesky style)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_home_feed(
  p_user_id uuid DEFAULT NULL,
  p_tab text DEFAULT 'discover',          -- 'discover' | 'following' | 'whats-hot'
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  -- following ids (only used when tab='following' and user provided)
  following_ids AS (
    SELECT following_id AS id
    FROM public.follows
    WHERE p_user_id IS NOT NULL
      AND p_tab = 'following'
      AND follower_id = p_user_id
  ),
  -- user's filter sets (empty when no user)
  hidden AS (
    SELECT post_id FROM public.hidden_posts WHERE p_user_id IS NOT NULL AND user_id = p_user_id
  ),
  muted_t AS (
    SELECT post_id FROM public.muted_threads WHERE p_user_id IS NOT NULL AND user_id = p_user_id
  ),
  muted_a AS (
    SELECT muted_user_id AS uid FROM public.muted_accounts WHERE p_user_id IS NOT NULL AND user_id = p_user_id
  ),
  blocked_a AS (
    SELECT blocked_user_id AS uid FROM public.blocked_accounts WHERE p_user_id IS NOT NULL AND user_id = p_user_id
  ),
  -- Original posts (top-level)
  base_posts AS (
    SELECT p.id, p.content, p.created_at, p.author_id, p.quote_post_id, p.video_url, p.embed_url
    FROM public.posts p
    WHERE p.parent_id IS NULL
      AND (p_tab <> 'following' OR p_user_id IS NULL OR p.author_id IN (SELECT id FROM following_ids))
      AND NOT EXISTS (SELECT 1 FROM hidden h WHERE h.post_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM muted_t mt WHERE mt.post_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM muted_a ma WHERE ma.uid = p.author_id)
      AND NOT EXISTS (SELECT 1 FROM blocked_a ba WHERE ba.uid = p.author_id)
    ORDER BY p.created_at DESC
    LIMIT p_limit
  ),
  -- Recent reposts (filtered by following when applicable)
  base_reposts AS (
    SELECT r.id AS repost_id, r.post_id, r.user_id AS reposter_id, r.created_at AS repost_created_at
    FROM public.reposts r
    WHERE (p_tab <> 'following' OR p_user_id IS NULL OR r.user_id IN (SELECT id FROM following_ids))
    ORDER BY r.created_at DESC
    LIMIT p_limit
  ),
  -- Posts referenced ONLY via reposts (not already in base_posts)
  reposted_only_posts AS (
    SELECT p.id, p.content, p.created_at, p.author_id, p.quote_post_id, p.video_url, p.embed_url
    FROM public.posts p
    WHERE p.parent_id IS NULL
      AND p.id IN (SELECT DISTINCT post_id FROM base_reposts)
      AND p.id NOT IN (SELECT id FROM base_posts)
      AND NOT EXISTS (SELECT 1 FROM hidden h WHERE h.post_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM muted_t mt WHERE mt.post_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM muted_a ma WHERE ma.uid = p.author_id)
      AND NOT EXISTS (SELECT 1 FROM blocked_a ba WHERE ba.uid = p.author_id)
  ),
  all_posts AS (
    SELECT *, true AS is_original FROM base_posts
    UNION ALL
    SELECT *, false AS is_original FROM reposted_only_posts
  ),
  post_ids AS (SELECT id FROM all_posts),
  quote_ids AS (SELECT DISTINCT quote_post_id AS id FROM all_posts WHERE quote_post_id IS NOT NULL),
  -- Aggregations
  like_counts AS (
    SELECT post_id, COUNT(*)::int AS c FROM public.likes WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id
  ),
  repost_counts AS (
    SELECT post_id, COUNT(*)::int AS c FROM public.reposts WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id
  ),
  reply_counts AS (
    SELECT parent_id AS post_id, COUNT(*)::int AS c
    FROM public.posts WHERE parent_id IN (SELECT id FROM post_ids) GROUP BY parent_id
  ),
  user_likes AS (
    SELECT post_id FROM public.likes
    WHERE p_user_id IS NOT NULL AND user_id = p_user_id AND post_id IN (SELECT id FROM post_ids)
  ),
  user_reposts AS (
    SELECT post_id FROM public.reposts
    WHERE p_user_id IS NOT NULL AND user_id = p_user_id AND post_id IN (SELECT id FROM post_ids)
  ),
  user_replies AS (
    SELECT DISTINCT parent_id AS post_id FROM public.posts
    WHERE p_user_id IS NOT NULL AND author_id = p_user_id AND parent_id IN (SELECT id FROM post_ids)
  ),
  -- Images for posts (aggregated)
  post_imgs AS (
    SELECT post_id, jsonb_agg(url ORDER BY position) AS urls
    FROM public.post_images WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id
  ),
  -- Quote post images
  quote_imgs AS (
    SELECT post_id, jsonb_agg(url ORDER BY position) AS urls
    FROM public.post_images WHERE post_id IN (SELECT id FROM quote_ids) GROUP BY post_id
  ),
  -- Quote post payloads
  quote_payloads AS (
    SELECT
      qp.id,
      jsonb_build_object(
        'id', qp.id,
        'content', qp.content,
        'createdAt', qp.created_at,
        'authorName', COALESCE(qpr.display_name, ''),
        'authorHandle', COALESCE(qpr.username, ''),
        'authorAvatar', COALESCE(qpr.avatar_url, ''),
        'images', COALESCE(qi.urls, '[]'::jsonb)
      ) AS payload
    FROM public.posts qp
    LEFT JOIN public.profiles qpr ON qpr.id = qp.author_id
    LEFT JOIN quote_imgs qi ON qi.post_id = qp.id
    WHERE qp.id IN (SELECT id FROM quote_ids)
  ),
  -- Build post payload (without feed-entry wrapper)
  post_payload AS (
    SELECT
      ap.id,
      jsonb_build_object(
        'id', ap.id,
        'authorId', ap.author_id,
        'authorName', COALESCE(pr.display_name, 'Unknown'),
        'authorHandle', COALESCE(pr.username, 'unknown'),
        'authorAvatar', COALESCE(pr.avatar_url, ''),
        'content', ap.content,
        'createdAt', ap.created_at,
        'images', COALESCE(pi.urls, '[]'::jsonb),
        'videoUrl', ap.video_url,
        'embedUrl', ap.embed_url,
        'likeCount', COALESCE(lc.c, 0),
        'replyCount', COALESCE(rc.c, 0),
        'repostCount', COALESCE(rpc.c, 0),
        'isLiked', (ul.post_id IS NOT NULL),
        'isReposted', (ur.post_id IS NOT NULL),
        'isReplied', (urr.post_id IS NOT NULL),
        'quotePost', qpl.payload
      ) AS post_json,
      ap.created_at,
      ap.is_original,
      ap.author_id
    FROM all_posts ap
    LEFT JOIN public.profiles pr ON pr.id = ap.author_id
    LEFT JOIN post_imgs pi ON pi.post_id = ap.id
    LEFT JOIN like_counts lc ON lc.post_id = ap.id
    LEFT JOIN repost_counts rc ON rc.post_id = ap.id
    LEFT JOIN reply_counts rpc ON rpc.post_id = ap.id
    LEFT JOIN user_likes ul ON ul.post_id = ap.id
    LEFT JOIN user_reposts ur ON ur.post_id = ap.id
    LEFT JOIN user_replies urr ON urr.post_id = ap.id
    LEFT JOIN quote_payloads qpl ON qpl.id = ap.quote_post_id
  ),
  -- Original-post feed entries
  original_entries AS (
    SELECT
      pp.created_at AS sort_time,
      'post-' || pp.id::text AS feed_key,
      jsonb_build_object(
        'sortTime', pp.created_at,
        'feedKey', 'post-' || pp.id::text,
        'repostedBy', NULL::jsonb,
        'post', pp.post_json
      ) AS entry
    FROM post_payload pp
    WHERE pp.is_original = true
  ),
  -- Repost feed entries (skip self-reposts; require reposter profile)
  repost_entries AS (
    SELECT
      br.repost_created_at AS sort_time,
      'repost-' || br.repost_id::text AS feed_key,
      jsonb_build_object(
        'sortTime', br.repost_created_at,
        'feedKey', 'repost-' || br.repost_id::text,
        'repostedBy', jsonb_build_object(
          'username', rpr.username,
          'displayName', rpr.display_name
        ),
        'post', pp.post_json
      ) AS entry
    FROM base_reposts br
    JOIN post_payload pp ON pp.id = br.post_id
    JOIN public.profiles rpr ON rpr.id = br.reposter_id
    WHERE br.reposter_id <> pp.author_id
  ),
  combined AS (
    SELECT * FROM original_entries
    UNION ALL
    SELECT * FROM repost_entries
  ),
  -- dedupe by feed_key, keep the latest sort_time row per key
  deduped AS (
    SELECT DISTINCT ON (feed_key) feed_key, sort_time, entry
    FROM combined
    ORDER BY feed_key, sort_time DESC
  ),
  ordered AS (
    SELECT entry
    FROM deduped
    ORDER BY
      CASE WHEN p_tab = 'whats-hot'
        THEN COALESCE((entry->'post'->>'likeCount')::int, 0)
           + COALESCE((entry->'post'->>'repostCount')::int, 0)
           + COALESCE((entry->'post'->>'replyCount')::int, 0)
      END DESC NULLS LAST,
      sort_time DESC
  )
  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb) INTO v_result FROM ordered;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_home_feed(uuid, text, int) TO anon, authenticated;
