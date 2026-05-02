-- Helper indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON public.posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON public.bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reposts_user_created2 ON public.reposts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user_post ON public.likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_post_pos ON public.post_images(post_id, position);

-- =========================================================
-- get_profile_feed: Posts/Replies/Media/Videos/Likes tabs
-- For "Posts" tab also include reposts by that profile.
-- Returns jsonb array of feed entries: { feedKey, sortTime, repostedBy, post }
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_profile_feed(
  p_profile_id uuid,
  p_viewer_id uuid DEFAULT NULL,
  p_tab text DEFAULT 'Posts',
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  base_posts AS (
    SELECT p.id, p.content, p.created_at, p.author_id, p.quote_post_id, p.video_url, p.embed_url
    FROM public.posts p
    WHERE
      CASE
        WHEN p_tab = 'Posts'    THEN p.author_id = p_profile_id AND p.parent_id IS NULL
        WHEN p_tab = 'Replies'  THEN p.author_id = p_profile_id AND p.parent_id IS NOT NULL
        WHEN p_tab = 'Media'    THEN p.author_id = p_profile_id AND p.parent_id IS NULL
                                     AND EXISTS (SELECT 1 FROM public.post_images pi WHERE pi.post_id = p.id)
        WHEN p_tab = 'Videos'   THEN p.author_id = p_profile_id AND p.parent_id IS NULL
                                     AND p.video_url IS NOT NULL AND p.video_url <> ''
        WHEN p_tab = 'Likes'    THEN p.id IN (SELECT post_id FROM public.likes WHERE user_id = p_profile_id)
        ELSE p.author_id = p_profile_id AND p.parent_id IS NULL
      END
    ORDER BY p.created_at DESC
    LIMIT p_limit
  ),
  base_reposts AS (
    SELECT r.id AS repost_id, r.post_id, r.created_at AS repost_created_at
    FROM public.reposts r
    WHERE p_tab = 'Posts' AND r.user_id = p_profile_id
    ORDER BY r.created_at DESC
    LIMIT p_limit
  ),
  reposted_posts AS (
    SELECT p.id, p.content, p.created_at, p.author_id, p.quote_post_id, p.video_url, p.embed_url
    FROM public.posts p
    WHERE p.id IN (SELECT post_id FROM base_reposts)
      AND p.parent_id IS NULL
      AND p.id NOT IN (SELECT id FROM base_posts)
  ),
  all_posts AS (
    SELECT *, true AS is_original FROM base_posts
    UNION ALL
    SELECT *, false AS is_original FROM reposted_posts
  ),
  post_ids AS (SELECT id FROM all_posts),
  quote_ids AS (SELECT DISTINCT quote_post_id AS id FROM all_posts WHERE quote_post_id IS NOT NULL),
  like_counts AS (SELECT post_id, COUNT(*)::int c FROM public.likes WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  repost_counts AS (SELECT post_id, COUNT(*)::int c FROM public.reposts WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  reply_counts AS (SELECT parent_id AS post_id, COUNT(*)::int c FROM public.posts WHERE parent_id IN (SELECT id FROM post_ids) GROUP BY parent_id),
  user_likes AS (SELECT post_id FROM public.likes WHERE p_viewer_id IS NOT NULL AND user_id = p_viewer_id AND post_id IN (SELECT id FROM post_ids)),
  user_reposts AS (SELECT post_id FROM public.reposts WHERE p_viewer_id IS NOT NULL AND user_id = p_viewer_id AND post_id IN (SELECT id FROM post_ids)),
  user_replies AS (SELECT DISTINCT parent_id AS post_id FROM public.posts WHERE p_viewer_id IS NOT NULL AND author_id = p_viewer_id AND parent_id IN (SELECT id FROM post_ids)),
  post_imgs AS (SELECT post_id, jsonb_agg(url ORDER BY position) urls FROM public.post_images WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  quote_imgs AS (SELECT post_id, jsonb_agg(url ORDER BY position) urls FROM public.post_images WHERE post_id IN (SELECT id FROM quote_ids) GROUP BY post_id),
  quote_payloads AS (
    SELECT qp.id,
      jsonb_build_object(
        'id', qp.id, 'content', qp.content, 'createdAt', qp.created_at,
        'authorName', COALESCE(qpr.display_name,''),
        'authorHandle', COALESCE(qpr.username,''),
        'authorAvatar', COALESCE(qpr.avatar_url,''),
        'images', COALESCE(qi.urls,'[]'::jsonb)
      ) AS payload
    FROM public.posts qp
    LEFT JOIN public.profiles qpr ON qpr.id = qp.author_id
    LEFT JOIN quote_imgs qi ON qi.post_id = qp.id
    WHERE qp.id IN (SELECT id FROM quote_ids)
  ),
  post_payload AS (
    SELECT ap.id, ap.author_id, ap.created_at, ap.is_original,
      jsonb_build_object(
        'id', ap.id, 'authorId', ap.author_id,
        'authorName', COALESCE(pr.display_name,'Unknown'),
        'authorHandle', COALESCE(pr.username,'unknown'),
        'authorAvatar', COALESCE(pr.avatar_url,''),
        'content', ap.content, 'createdAt', ap.created_at,
        'images', COALESCE(pi.urls,'[]'::jsonb),
        'videoUrl', ap.video_url, 'embedUrl', ap.embed_url,
        'likeCount', COALESCE(lc.c,0),
        'replyCount', COALESCE(rc.c,0),
        'repostCount', COALESCE(rpc.c,0),
        'isLiked', (ul.post_id IS NOT NULL),
        'isReposted', (ur.post_id IS NOT NULL),
        'isReplied', (urr.post_id IS NOT NULL),
        'quotePost', qpl.payload
      ) AS post_json
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
  profile_info AS (
    SELECT username, display_name FROM public.profiles WHERE id = p_profile_id
  ),
  original_entries AS (
    SELECT pp.created_at AS sort_time,
      jsonb_build_object(
        'feedKey', 'post-' || pp.id::text,
        'sortTime', pp.created_at,
        'repostedBy', NULL::jsonb,
        'post', pp.post_json
      ) AS entry
    FROM post_payload pp
    WHERE pp.is_original = true
  ),
  repost_entries AS (
    SELECT br.repost_created_at AS sort_time,
      jsonb_build_object(
        'feedKey', 'repost-' || br.repost_id::text,
        'sortTime', br.repost_created_at,
        'repostedBy', jsonb_build_object('username', pi.username, 'displayName', pi.display_name),
        'post', pp.post_json
      ) AS entry
    FROM base_reposts br
    JOIN post_payload pp ON pp.id = br.post_id
    CROSS JOIN profile_info pi
  ),
  combined AS (
    SELECT * FROM original_entries
    UNION ALL
    SELECT * FROM repost_entries
  ),
  ordered AS (
    SELECT entry FROM combined ORDER BY sort_time DESC
  )
  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb) INTO v_result FROM ordered;

  RETURN v_result;
END;
$$;

-- =========================================================
-- get_posts_by_search: Used by PublicFeed (no filter), Hashtag, Trending
-- Returns jsonb array of post payloads (flat, like PostCard props)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_posts_by_search(
  p_pattern text DEFAULT NULL,
  p_viewer_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  base_posts AS (
    SELECT p.id, p.content, p.created_at, p.author_id, p.quote_post_id, p.video_url, p.embed_url
    FROM public.posts p
    WHERE p.parent_id IS NULL
      AND (p_pattern IS NULL OR p.content ILIKE p_pattern)
    ORDER BY p.created_at DESC
    LIMIT p_limit
  ),
  post_ids AS (SELECT id FROM base_posts),
  quote_ids AS (SELECT DISTINCT quote_post_id AS id FROM base_posts WHERE quote_post_id IS NOT NULL),
  like_counts AS (SELECT post_id, COUNT(*)::int c FROM public.likes WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  repost_counts AS (SELECT post_id, COUNT(*)::int c FROM public.reposts WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  reply_counts AS (SELECT parent_id AS post_id, COUNT(*)::int c FROM public.posts WHERE parent_id IN (SELECT id FROM post_ids) GROUP BY parent_id),
  user_likes AS (SELECT post_id FROM public.likes WHERE p_viewer_id IS NOT NULL AND user_id = p_viewer_id AND post_id IN (SELECT id FROM post_ids)),
  user_reposts AS (SELECT post_id FROM public.reposts WHERE p_viewer_id IS NOT NULL AND user_id = p_viewer_id AND post_id IN (SELECT id FROM post_ids)),
  user_replies AS (SELECT DISTINCT parent_id AS post_id FROM public.posts WHERE p_viewer_id IS NOT NULL AND author_id = p_viewer_id AND parent_id IN (SELECT id FROM post_ids)),
  post_imgs AS (SELECT post_id, jsonb_agg(url ORDER BY position) urls FROM public.post_images WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  quote_imgs AS (SELECT post_id, jsonb_agg(url ORDER BY position) urls FROM public.post_images WHERE post_id IN (SELECT id FROM quote_ids) GROUP BY post_id),
  quote_payloads AS (
    SELECT qp.id,
      jsonb_build_object(
        'id', qp.id, 'content', qp.content, 'createdAt', qp.created_at,
        'authorName', COALESCE(qpr.display_name,''),
        'authorHandle', COALESCE(qpr.username,''),
        'authorAvatar', COALESCE(qpr.avatar_url,''),
        'images', COALESCE(qi.urls,'[]'::jsonb)
      ) AS payload
    FROM public.posts qp
    LEFT JOIN public.profiles qpr ON qpr.id = qp.author_id
    LEFT JOIN quote_imgs qi ON qi.post_id = qp.id
    WHERE qp.id IN (SELECT id FROM quote_ids)
  ),
  ordered AS (
    SELECT
      jsonb_build_object(
        'id', bp.id, 'authorId', bp.author_id,
        'authorName', COALESCE(pr.display_name,'Unknown'),
        'authorHandle', COALESCE(pr.username,'unknown'),
        'authorAvatar', COALESCE(pr.avatar_url,''),
        'content', bp.content, 'createdAt', bp.created_at,
        'images', COALESCE(pi.urls,'[]'::jsonb),
        'videoUrl', bp.video_url, 'embedUrl', bp.embed_url,
        'likeCount', COALESCE(lc.c,0),
        'replyCount', COALESCE(rc.c,0),
        'repostCount', COALESCE(rpc.c,0),
        'isLiked', (ul.post_id IS NOT NULL),
        'isReposted', (ur.post_id IS NOT NULL),
        'isReplied', (urr.post_id IS NOT NULL),
        'quotePost', qpl.payload
      ) AS entry,
      bp.created_at
    FROM base_posts bp
    LEFT JOIN public.profiles pr ON pr.id = bp.author_id
    LEFT JOIN post_imgs pi ON pi.post_id = bp.id
    LEFT JOIN like_counts lc ON lc.post_id = bp.id
    LEFT JOIN repost_counts rc ON rc.post_id = bp.id
    LEFT JOIN reply_counts rpc ON rpc.post_id = bp.id
    LEFT JOIN user_likes ul ON ul.post_id = bp.id
    LEFT JOIN user_reposts ur ON ur.post_id = bp.id
    LEFT JOIN user_replies urr ON urr.post_id = bp.id
    LEFT JOIN quote_payloads qpl ON qpl.id = bp.quote_post_id
    ORDER BY bp.created_at DESC
  )
  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb) INTO v_result FROM ordered;
  RETURN v_result;
END;
$$;

-- =========================================================
-- get_saved_posts: Bookmarks for the viewer
-- Returns jsonb array of post payloads ordered by bookmark time
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_saved_posts(
  p_viewer_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  bms AS (
    SELECT post_id, created_at FROM public.bookmarks
    WHERE user_id = p_viewer_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ),
  base_posts AS (
    SELECT p.id, p.content, p.created_at, p.author_id, p.quote_post_id, p.video_url, p.embed_url, p.parent_id, b.created_at AS bookmarked_at
    FROM public.posts p
    JOIN bms b ON b.post_id = p.id
  ),
  post_ids AS (SELECT id FROM base_posts),
  quote_ids AS (SELECT DISTINCT quote_post_id AS id FROM base_posts WHERE quote_post_id IS NOT NULL),
  like_counts AS (SELECT post_id, COUNT(*)::int c FROM public.likes WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  repost_counts AS (SELECT post_id, COUNT(*)::int c FROM public.reposts WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  reply_counts AS (SELECT parent_id AS post_id, COUNT(*)::int c FROM public.posts WHERE parent_id IN (SELECT id FROM post_ids) GROUP BY parent_id),
  user_likes AS (SELECT post_id FROM public.likes WHERE user_id = p_viewer_id AND post_id IN (SELECT id FROM post_ids)),
  user_reposts AS (SELECT post_id FROM public.reposts WHERE user_id = p_viewer_id AND post_id IN (SELECT id FROM post_ids)),
  user_replies AS (SELECT DISTINCT parent_id AS post_id FROM public.posts WHERE author_id = p_viewer_id AND parent_id IN (SELECT id FROM post_ids)),
  post_imgs AS (SELECT post_id, jsonb_agg(url ORDER BY position) urls FROM public.post_images WHERE post_id IN (SELECT id FROM post_ids) GROUP BY post_id),
  quote_imgs AS (SELECT post_id, jsonb_agg(url ORDER BY position) urls FROM public.post_images WHERE post_id IN (SELECT id FROM quote_ids) GROUP BY post_id),
  quote_payloads AS (
    SELECT qp.id,
      jsonb_build_object(
        'id', qp.id, 'content', qp.content, 'createdAt', qp.created_at,
        'authorName', COALESCE(qpr.display_name,''),
        'authorHandle', COALESCE(qpr.username,''),
        'authorAvatar', COALESCE(qpr.avatar_url,''),
        'images', COALESCE(qi.urls,'[]'::jsonb)
      ) AS payload
    FROM public.posts qp
    LEFT JOIN public.profiles qpr ON qpr.id = qp.author_id
    LEFT JOIN quote_imgs qi ON qi.post_id = qp.id
    WHERE qp.id IN (SELECT id FROM quote_ids)
  ),
  ordered AS (
    SELECT
      jsonb_build_object(
        'id', bp.id, 'authorId', bp.author_id,
        'authorName', COALESCE(pr.display_name,'Unknown'),
        'authorHandle', COALESCE(pr.username,'unknown'),
        'authorAvatar', COALESCE(pr.avatar_url,''),
        'content', bp.content, 'createdAt', bp.created_at,
        'images', COALESCE(pi.urls,'[]'::jsonb),
        'videoUrl', bp.video_url, 'embedUrl', bp.embed_url,
        'likeCount', COALESCE(lc.c,0),
        'replyCount', COALESCE(rc.c,0),
        'repostCount', COALESCE(rpc.c,0),
        'isLiked', (ul.post_id IS NOT NULL),
        'isReposted', (ur.post_id IS NOT NULL),
        'isReplied', (urr.post_id IS NOT NULL),
        'quotePost', qpl.payload
      ) AS entry,
      bp.bookmarked_at
    FROM base_posts bp
    LEFT JOIN public.profiles pr ON pr.id = bp.author_id
    LEFT JOIN post_imgs pi ON pi.post_id = bp.id
    LEFT JOIN like_counts lc ON lc.post_id = bp.id
    LEFT JOIN repost_counts rc ON rc.post_id = bp.id
    LEFT JOIN reply_counts rpc ON rpc.post_id = bp.id
    LEFT JOIN user_likes ul ON ul.post_id = bp.id
    LEFT JOIN user_reposts ur ON ur.post_id = bp.id
    LEFT JOIN user_replies urr ON urr.post_id = bp.id
    LEFT JOIN quote_payloads qpl ON qpl.id = bp.quote_post_id
    ORDER BY bp.bookmarked_at DESC
  )
  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb) INTO v_result FROM ordered;
  RETURN v_result;
END;
$$;