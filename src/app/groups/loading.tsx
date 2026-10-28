import { Bone, CardSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <div className="space-y-2">
        <Bone className="h-7 w-40" />
        <Bone className="h-3 w-20" />
      </div>
      <CardSkeleton lines={1} />
      <CardSkeleton lines={3} />
    </div>
  );
}
