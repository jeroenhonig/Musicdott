import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/layouts/app-layout';

interface StudentViewSkeletonProps {
  showMetadataBadges?: boolean;
}

export default function StudentViewSkeleton({ showMetadataBadges = false }: StudentViewSkeletonProps) {
  return (
    <AppLayout title="Loading...">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              {showMetadataBadges && (
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              )}
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </AppLayout>
  );
}
