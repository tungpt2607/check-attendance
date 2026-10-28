import { PageSkeleton } from "@/components/skeleton";

/** Trang nhóm tham gia: tiêu đề, thẻ Chuyên cần, thẻ Thành viên, danh sách buổi */
export default function Loading() {
  return <PageSkeleton narrow cards={[2, 6, 5]} />;
}
