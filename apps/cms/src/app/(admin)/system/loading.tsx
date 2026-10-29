import { PageSkeleton } from "@check-attendance/ui/skeleton";

/** Hệ thống: Trạng thái, Gửi email thử, Nhật ký */
export default function Loading() {
  return <PageSkeleton cards={[5, 2, 1]} />;
}
