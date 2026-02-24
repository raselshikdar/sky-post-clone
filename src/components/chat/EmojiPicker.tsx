import { useState } from "react";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀","😂","🥹","😍","🤩","😘","😜","🤔","😎","🥳","😢","😤","🤯","🫡","😴","🤗","🫣","😈","💀","🤖"],
  "Gestures": ["👍","👎","👏","🙌","🤝","✌️","🤞","🫶","❤️","🔥","💯","⭐","✨","🎉","💪","🙏","👀","🫠","💅","🤷"],
  "Animals": ["🐶","🐱","🐻","🦊","🐼","🐸","🐵","🦋","🐝","🐢","🐙","🦄","🐬","🦜","🐧"],
  "Food": ["🍕","🍔","🍟","🌮","🍣","🍩","🎂","🍫","☕","🧋","🍷","🍺","🥤","🍜","🥗"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState("Smileys");
  const categories = Object.keys(EMOJI_CATEGORIES);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-background shadow-xl animate-scale-in z-50">
      {/* Category tabs */}
      <div className="flex gap-1 px-2 pt-2 border-b border-border overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, i) => (
          <button
            key={i}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="flex items-center justify-center h-9 w-9 rounded-lg text-xl hover:bg-accent transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
