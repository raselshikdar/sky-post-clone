import { Menu } from "lucide-react"; // Hash বাদ দেওয়া হয়েছে
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import MobileDrawer from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import AwajLogo from "@/components/AwajLogo";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

// --- আপনার লজিক অনুযায়ী কাস্টম হ্যাশ আইকন ---
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
    {/* রেখার মোট দৈর্ঘ্য ঠিক রেখে মাঝখানের গ্যাপ বাড়ানো হয়েছে (y=9 থেকে 7.5 এবং y=15 থেকে 16.5) */}
    <line x1="4" y1="7.5" x2="20" y2="7.5" />
    <line x1="4" y1="16.5" x2="20" y2="16.5" />
    
    {/* রেখার দৈর্ঘ্য ঠিক রেখে মাঝখানের গ্যাপ বাড়ানো হয়েছে (x=10 থেকে 8.5 এবং x=16 থেকে 17.5) */}
    <line x1="8.5" y1="3" x2="6.5" y2="21" />
    <line x1="17.5" y1="3" x2="15.5" y2="21" />
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
