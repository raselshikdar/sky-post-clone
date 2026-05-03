import { describe, it, expect } from "vitest";
import { validateFlatPost, validateFeedEntry, validateList } from "./postShape";

/**
 * Sample payloads model the JSON returned by Postgres RPCs:
 *   - get_posts_by_search / get_saved_posts → flat post objects
 *   - get_profile_feed / get_home_feed     → entry-wrapped objects
 */

const flatPost = {
  id: "p1",
  authorId: "u1",
  authorName: "Alice",
  authorHandle: "alice",
  authorAvatar: "",
  content: "hello",
  createdAt: "2026-05-01T00:00:00Z",
  images: [],
  videoUrl: null,
  embedUrl: null,
  likeCount: 0,
  replyCount: 0,
  repostCount: 0,
  isLiked: false,
  isReposted: false,
  isReplied: false,
  quotePost: null,
};

const entry = {
  feedKey: "post-p1",
  sortTime: "2026-05-01T00:00:00Z",
  repostedBy: null,
  post: flatPost,
};

const repostEntry = {
  feedKey: "repost-r1",
  sortTime: "2026-05-01T00:00:00Z",
  repostedBy: { username: "bob", displayName: "Bob" },
  post: flatPost,
};

describe("RPC shape: get_posts_by_search / get_saved_posts (flat)", () => {
  it("accepts a well-formed flat post (PublicFeed/Hashtag/Trending/SavedPosts)", () => {
    expect(validateFlatPost(flatPost)).toEqual([]);
  });

  it("flags missing required PostCardProps fields", () => {
    const broken = { ...flatPost } as any;
    delete broken.likeCount;
    delete broken.isLiked;
    const issues = validateFlatPost(broken);
    expect(issues.map((i) => i.path)).toEqual(
      expect.arrayContaining(["post.likeCount", "post.isLiked"]),
    );
  });

  it("flags undefined values (no missing data allowed)", () => {
    const broken = { ...flatPost, authorName: undefined } as any;
    const issues = validateFlatPost(broken);
    expect(issues.some((i) => i.path === "post.authorName")).toBe(true);
  });

  it("flags wrong types", () => {
    const broken = { ...flatPost, likeCount: "5" } as any;
    const issues = validateFlatPost(broken);
    expect(issues.some((i) => i.path === "post.likeCount")).toBe(true);
  });
});

describe("RPC shape: get_profile_feed / get_home_feed (entry-wrapped)", () => {
  it("accepts an original-post entry", () => {
    expect(validateFeedEntry(entry)).toEqual([]);
  });

  it("accepts a repost entry with repostedBy", () => {
    expect(validateFeedEntry(repostEntry)).toEqual([]);
  });

  it("flags missing feedKey", () => {
    const broken = { ...entry, feedKey: undefined } as any;
    const issues = validateFeedEntry(broken);
    expect(issues.some((i) => i.path.endsWith("feedKey"))).toBe(true);
  });

  it("flags malformed repostedBy", () => {
    const broken = { ...entry, repostedBy: { username: "x" } } as any;
    const issues = validateFeedEntry(broken);
    expect(issues.some((i) => i.path.endsWith("repostedBy"))).toBe(true);
  });

  it("recursively validates the wrapped post payload", () => {
    const broken = { ...entry, post: { ...flatPost, isReposted: undefined } } as any;
    const issues = validateFeedEntry(broken);
    expect(issues.some((i) => i.path === "entry.post.isReposted")).toBe(true);
  });
});

describe("validateList", () => {
  it("validates flat lists (SavedPosts, PublicFeed, Hashtag, Trending)", () => {
    expect(validateList([flatPost, flatPost], "flat")).toEqual([]);
  });

  it("validates entry lists (Profile, Home)", () => {
    expect(validateList([entry, repostEntry], "entry")).toEqual([]);
  });

  it("reports per-index paths for failures", () => {
    const bad = { ...flatPost, id: undefined } as any;
    const issues = validateList([flatPost, bad], "flat");
    expect(issues[0].path.startsWith("[1]")).toBe(true);
  });
});
