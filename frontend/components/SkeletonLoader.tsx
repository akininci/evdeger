function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />;
}

export function SkeletonLoader() {
  return (
    <div className="py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Hero skeleton */}
        <div className="text-center mb-10">
          <SkeletonBlock className="h-4 w-24 mx-auto mb-3" />
          <SkeletonBlock className="h-10 w-80 mx-auto mb-2" />
          <SkeletonBlock className="h-5 w-48 mx-auto mb-2" />
          <div className="flex items-center justify-center gap-2 mt-3">
            <SkeletonBlock className="h-6 w-32" />
            <SkeletonBlock className="h-6 w-20" />
          </div>
        </div>

        {/* Value cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>

        {/* Chart skeleton */}
        <SkeletonBlock className="h-80 mb-8" />

        {/* Trend chart skeleton */}
        <SkeletonBlock className="h-72 mb-8" />

        {/* Detail form skeleton */}
        <SkeletonBlock className="h-48 mb-8" />

        {/* Listings skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-56" />
          ))}
        </div>
      </div>
    </div>
  );
}
