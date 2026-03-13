import { Menu } from "lucide-react"; // Hash বাদ দেওয়া হয়েছে
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import MobileDrawer from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import AwajLogo from "@/components/AwajLogo";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

// --- Bluesky Specific Proportion Hash Icon (মাঝামাঝি পারফেক্ট সাইজ) ---
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
    {/* রম্বসের সাইজ আগের বড় এবং ছোটর একদম মাঝামাঝি রাখা হয়েছে */}
    <line x1="4" y1="7.875" x2="20" y2="7.875" />
    <line x1="4" y1="16.125" x2="20" y2="16.125" />
    
    {/* উল্লম্ব রেখাগুলোকেও ঠিক মাঝামাঝি পজিশনে রাখা হয়েছে */}
    <line x1="8.875" y1="3" x2="6.875" y2="21" />
    <line x1="17.125" y1="3" x2="15.125" y2="21" />
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
