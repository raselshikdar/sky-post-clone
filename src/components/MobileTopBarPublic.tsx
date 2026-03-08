import { Menu } from "lucide-react";
import AwajLogo from "@/components/AwajLogo";

interface MobileTopBarPublicProps {
  onMenuClick: () => void;
  hidden?: boolean;
}

export default function MobileTopBarPublic({ onMenuClick, hidden = false }: MobileTopBarPublicProps) {
  return (
    <header className={`sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm lg:hidden transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <button onClick={onMenuClick} className="p-1 text-foreground">
        <Menu className="h-6 w-6" strokeWidth={1.75} />
      </button>
      <AwajLogo className="h-8 w-8" />
      <div className="w-6" />
    </header>
  );
}
