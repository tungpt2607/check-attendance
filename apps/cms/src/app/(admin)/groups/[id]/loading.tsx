import { PageSkeleton } from "@check-attendance/ui/skeleton";

/** Chi tiết nhóm: Thông tin, Thành viên, Buổi điểm danh, Vùng nguy hiểm */
export default function Loading() {
  return <PageSkeleton cards={[4, 5, 4, 1]} />;
}
