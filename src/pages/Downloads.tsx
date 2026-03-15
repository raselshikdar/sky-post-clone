import { ArrowLeft, Download, Smartphone, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const APK_URL = "https://github.com/raselshikdar/sky-post-clone/releases/download/v1.2.0/Awaj.v1.2.0.apk";

export default function Downloads() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Downloads</h1>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/awaj-logo.png" alt="Awaj Logo" className="h-20 w-20 rounded-2xl mb-4 shadow-lg" />
          <h2 className="text-2xl font-bold text-foreground">Awaj</h2>
          <p className="text-muted-foreground mt-1">Version 1.2.0</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h3 className="font-semibold text-foreground mb-3">About the App</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Awaj is a social platform where you can share your thoughts, connect with people, and stay updated with trending topics. Get the Android app for the best mobile experience with push notifications and offline support.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Smartphone, label: "Android" },
            { icon: Shield, label: "Secure" },
            { icon: Zap, label: "Fast" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <a href={APK_URL} download>
          <Button className="w-full gap-2 rounded-full py-6 text-base font-semibold">
            <Download className="h-5 w-5" />
            Download APK
          </Button>
        </a>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Android 5.0+ required · ~15 MB
        </p>
      </div>
    </div>
  );
}
