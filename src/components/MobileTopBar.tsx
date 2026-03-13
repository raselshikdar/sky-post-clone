import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import MobileDrawer from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import AwajLogo from "@/components/AwajLogo";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

// --- Bluesky Specific Proportion Hash Icon ---
const BskyHashtag = (props: any) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" /* হ্যামবার্গার মেনুর সমান थিকনেস */
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    {/* আপনার বিশ্লেষণ অনুযায়ী: মাঝখানের বর্গ বড়, কোণার বর্ধিত রেখা ছোট */}
    {/* অনুভূমিক রেখা (Horizontal Lines) - বর্ধিত অংশ কমানো হয়েছে */}
    <line x1="6" y1="9" x2="18" y2="9" />
    <line x1="6" y1="15" x2="18" y2="15" />
    
    {/* উল্লম্ব রেখা (Vertical Lines) - বর্ধিত অংশ কমানো হয়েছে এবং টাইট স্ল্যান্ট দেওয়া হয়েছে */}
    <line x1="11" y1="5" x2="9" y2="19" />
    <line x1="15" y1="5" x2="13" y2="19" />
  </svg>
);

export default function MobileTopBar() {
  const { profile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const headerHidden = useScrollDirection();

  return (
    <>
      <header className={`sticky top-0 z-30 flex items-center justify-between bg-background/95 px-[18px] py-1.5 backdrop-blur-sm lg:hidden transition-transform duration-300 ${headerHidden ? "-translate-y-full" : "translate-y-0"}`}>
        <button onClick={() => setDrawerOpen(true)} className="p-0">
          <Menu className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
        </button>

        <AwajLogo className="h-8 w-8" />

        <button onClick={() => navigate("/feeds")} className="p-0">
          {/* সাইজ হ্যামবার্গার মেনুর সাথে সমান (h-6 w-6) রাখা হয়েছে */}
          <BskyHashtag className="h-6 w-6 text-muted-foreground" />
        </button>
      </header>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </    </>
  );
}
