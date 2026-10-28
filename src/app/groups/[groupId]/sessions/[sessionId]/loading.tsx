import { Bone, CardSkeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <CardSkeleton lines={1} />
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Bone className="h-10 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-40" />
            <Bone className="h-8 w-56" />
          </div>
        ))}
      </div>
    </div>
  );
}
