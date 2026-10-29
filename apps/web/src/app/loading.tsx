import { PageSkeleton } from "@check-attendance/ui/skeleton";

/** Khung chờ mặc định cho mọi trang chưa có khung riêng (lưới an toàn cho trang mới) */
export default function Loading() {
  return <PageSkeleton cards={[3, 3]} />;
}
