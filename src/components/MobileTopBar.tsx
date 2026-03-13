import { Menu } from "lucide-react"; // Hash বাদ দেওয়া হয়েছে
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import MobileDrawer from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import AwajLogo from "@/components/AwajLogo";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

// --- Bluesky Specific Proportion Hash Icon (মাঝখানের রম্বস সামান্য ছোট করা হয়েছে) ---
const BskyHashtag = (props: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    {/* রম্বস সামান্য ছোট করার জন্য অনুভূমিক রেখা কেন্দ্রের দিকে আনা হয়েছে (y=7.5 থেকে 8.25 এবং y=16.5 থেকে 15.75) */}
    <line x1="4" y1="8.25" x2="20" y2="8.25" />
    <line x1="4" y1="15.75" x2="20" y2="15.75" />
    
    {/* রম্বস সামান্য ছোট করার জন্য উল্লম্ব রেখা কেন্দ্রের দিকে আনা হয়েছে (x=8.5 থেকে 9.25 এবং x=17.5 থেকে 16.75) */}
    <line x1="9.25" y1="3" x2="7.25" y2="21" />
    <line x1="16.75" y1="3" x2="14.75" y2="21" />
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
          {/* একদম অরিজিনাল ক্লাস এবং স্ট্রোক-উইথ অপরিবর্তিত রাখা হয়েছে */}
          <BskyHashtag className="h-6 w-6 text-muted-foreground" strokeWidth={2} />
        </button>
      </header>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
