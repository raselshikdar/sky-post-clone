import { Compass } from "lucide-react";

export default function Feeds() {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <h2 className="text-lg font-bold">Feeds</h2>
      </div>
      <div className="py-12 text-center">
        <Compass className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Custom feeds coming soon</p>
      </div>
    </div>
  );
}
