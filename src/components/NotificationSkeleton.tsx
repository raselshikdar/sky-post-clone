import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3.5 border-b border-border">
      <Skeleton className="h-5 w-5 rounded flex-shrink-0 mt-1" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
