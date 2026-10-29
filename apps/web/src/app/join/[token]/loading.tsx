import { CenteredListSkeleton } from "@check-attendance/ui/skeleton";

/** Tham gia nhóm: logo, tên nhóm, ô tìm kiếm, danh sách tên để chọn */
export default function Loading() {
  return <CenteredListSkeleton rows={7} />;
}
