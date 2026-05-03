/**
 * Runtime validators for RPC payloads consumed by PostCard.
 *
 * These guards verify that the JSON returned by the database functions
 * `get_profile_feed`, `get_posts_by_search`, `get_saved_posts` (and the
 * existing `get_home_feed`) matches the shape PostCard expects via
 * `PostCardProps`. Use them in tests, and optionally at runtime in dev to
 * surface drift between SQL and frontend.
 */

/** Required keys on a flat post payload (matches PostCardProps) */
export const REQUIRED_POST_FIELDS = [
  "id",
  "authorId",
  "authorName",
  "authorHandle",
  "authorAvatar",
  "content",
  "createdAt",
  "likeCount",
  "replyCount",
  "repostCount",
  "isLiked",
  "isReposted",
] as const;

/** Optional keys that may be present (null/undefined allowed) */
export const OPTIONAL_POST_FIELDS = [
  "images",
  "videoUrl",
  "embedUrl",
  "isReplied",
  "quotePost",
] as const;

export type ShapeIssue = { path: string; message: string };

function checkPost(post: any, path: string, issues: ShapeIssue[]): void {
  if (!post || typeof post !== "object") {
    issues.push({ path, message: "post is not an object" });
    return;
  }
  for (const f of REQUIRED_POST_FIELDS) {
    if (!(f in post)) {
      issues.push({ path: `${path}.${f}`, message: "missing required field" });
      continue;
    }
    const v = (post as any)[f];
    if (v === undefined) {
      issues.push({ path: `${path}.${f}`, message: "is undefined" });
    }
  }
  // type spot-checks
  const typeMap: Record<string, "string" | "number" | "boolean"> = {
    id: "string", authorId: "string", authorName: "string",
    authorHandle: "string", authorAvatar: "string", content: "string",
    createdAt: "string",
    likeCount: "number", replyCount: "number", repostCount: "number",
    isLiked: "boolean", isReposted: "boolean",
  };
  for (const [k, t] of Object.entries(typeMap)) {
    const v = (post as any)[k];
    if (v != null && typeof v !== t) {
      issues.push({ path: `${path}.${k}`, message: `expected ${t}, got ${typeof v}` });
    }
  }
  if (post.images != null && !Array.isArray(post.images)) {
    issues.push({ path: `${path}.images`, message: "expected array" });
  }
  if (post.quotePost != null) {
    const q = post.quotePost;
    for (const k of ["id", "content", "authorName", "authorHandle", "authorAvatar", "createdAt"]) {
      if (!(k in q)) issues.push({ path: `${path}.quotePost.${k}`, message: "missing" });
    }
  }
}

/** Validate a flat post item (used by Hashtag/Trending/PublicFeed/SavedPosts). */
export function validateFlatPost(item: any, path = "post"): ShapeIssue[] {
  const issues: ShapeIssue[] = [];
  checkPost(item, path, issues);
  return issues;
}

/** Validate a feed entry wrapper { feedKey, post, repostedBy } (Profile/Home). */
export function validateFeedEntry(entry: any, path = "entry"): ShapeIssue[] {
  const issues: ShapeIssue[] = [];
  if (!entry || typeof entry !== "object") {
    issues.push({ path, message: "entry is not an object" });
    return issues;
  }
  if (typeof entry.feedKey !== "string") {
    issues.push({ path: `${path}.feedKey`, message: "missing/invalid feedKey" });
  }
  if (!("repostedBy" in entry)) {
    issues.push({ path: `${path}.repostedBy`, message: "missing key (should be null or object)" });
  } else if (entry.repostedBy != null) {
    const rb = entry.repostedBy;
    if (typeof rb.username !== "string" || typeof rb.displayName !== "string") {
      issues.push({ path: `${path}.repostedBy`, message: "must have username + displayName" });
    }
  }
  checkPost(entry.post, `${path}.post`, issues);
  return issues;
}

/** Validate an array; returns a flat list of issues with index in the path. */
export function validateList(
  items: any[],
  variant: "flat" | "entry",
): ShapeIssue[] {
  if (!Array.isArray(items)) return [{ path: "$", message: "not an array" }];
  const issues: ShapeIssue[] = [];
  items.forEach((it, i) => {
    const sub = variant === "flat"
      ? validateFlatPost(it, `[${i}]`)
      : validateFeedEntry(it, `[${i}]`);
    issues.push(...sub);
  });
  return issues;
}
