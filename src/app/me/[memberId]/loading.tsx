import { PageSkeleton } from "@/components/skeleton";

/** Lịch sử nhóm tham gia: tiêu đề, thẻ Chuyên cần, danh sách buổi */
export default function Loading() {
  return <PageSkeleton narrow cards={[2, 6]} />;
}
