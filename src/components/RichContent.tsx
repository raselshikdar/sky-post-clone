import { useNavigate } from "react-router-dom";

interface RichContentProps {
  content: string;
  className?: string;
}

/**
 * Renders post content with clickable #hashtags, @mentions, and URLs.
 */
export default function RichContent({ content, className }: RichContentProps) {
  const navigate = useNavigate();

  // Combined regex: URLs, hashtags, mentions
  const tokenRegex = /(https?:\/\/[^\s]+)|(@[\w\u0980-\u09FF]+)|(#[\w\u0980-\u09FF]+)/g;

  const parts: { type: "text" | "url" | "mention" | "hashtag"; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    if (match[1]) parts.push({ type: "url", value: match[1] });
    else if (match[2]) parts.push({ type: "mention", value: match[2] });
    else if (match[3]) parts.push({ type: "hashtag", value: match[3] });
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        switch (part.type) {
          case "url":
            return (
              <a
                key={i}
                href={part.value}
                className="bsky-link"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {part.value}
              </a>
            );
          case "mention": {
            const username = part.value.slice(1); // remove @
            return (
              <button
                key={i}
                className="bsky-link font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${username}`);
                }}
              >
                {part.value}
              </button>
            );
          }
          case "hashtag": {
            const tag = part.value.slice(1); // remove #
            return (
              <button
                key={i}
                className="bsky-link font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/hashtag/${tag}`);
                }}
              >
                {part.value}
              </button>
            );
          }
          default:
            return <span key={i}>{part.value}</span>;
        }
      })}
    </span>
  );
}
