import { PageSkeleton } from "@check-attendance/ui/skeleton";

/** Chi tiết tài khoản: tiêu đề, Thông tin, Thao tác, Nhóm quản lý, Nhóm tham gia */
export default function Loading() {
  return <PageSkeleton cards={[3, 1, 3, 2]} />;
}
