/** Khối xám nhấp nháy giữ chỗ trong lúc trang đang tải */
export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

/** Thẻ trắng chứa vài dòng giữ chỗ */
export function CardSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <Bone className="h-4 w-32" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={`h-9 ${i % 2 ? "w-4/5" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Tiêu đề trang giữ chỗ */
export function TitleSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="h-3 w-24" />
      <Bone className="h-7 w-48" />
      <Bone className="h-3 w-56" />
    </div>
  );
}
