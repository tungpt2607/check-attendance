import { PageSkeleton } from "@check-attendance/ui/skeleton";

/** Thông báo hệ thống: form gửi (tiêu đề, nội dung, đường dẫn, email, nút) + lịch sử */
export default function Loading() {
  return <PageSkeleton cards={[5, 4]} />;
}
