import { Bone, CardSkeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <div className="flex gap-2">
        <Bone className="h-9 w-20" />
        <Bone className="h-9 w-24" />
      </div>
      <CardSkeleton lines={4} />
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={2} />
      </div>
    </div>
  );
}
