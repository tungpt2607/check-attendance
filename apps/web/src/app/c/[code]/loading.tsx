import { CenteredListSkeleton } from "@/components/skeleton";

/** Màn hình đầu tiên sau khi quét QR: hiện ngay khung trang tự điểm danh trong lúc chuyển tiếp */
export default function Loading() {
  return <CenteredListSkeleton rows={7} logo={false} />;
}
