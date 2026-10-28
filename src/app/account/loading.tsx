import { Bone, CardSkeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-lg space-y-6" aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Bone className="h-[72px] w-[72px] rounded-full" />
        <Bone className="h-9 w-24" />
      </div>
      <CardSkeleton lines={1} />
      <CardSkeleton lines={3} />
    </div>
  );
}
