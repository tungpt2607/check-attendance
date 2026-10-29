import { CenteredListSkeleton } from "@check-attendance/ui/skeleton";

/** Tự điểm danh: tên nhóm/buổi, ô tìm kiếm, danh sách tên */
export default function Loading() {
  return <CenteredListSkeleton rows={7} logo={false} />;
}
