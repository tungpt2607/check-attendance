// Trang tất cả thông báo (mở từ "Xem tất cả thông báo" trong chuông)
import Box from "@mui/material/Box";
import { NotificationFeed } from "@/components/notification-feed";
import { PageHeader } from "@check-attendance/ui/page-header";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import type { NotificationList } from "@check-attendance/shared/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thông báo · Điểm danh" };

const PAGE_SIZE = 20;

export default async function NotificationsPage() {
  await requireUser();
  const initial = await api<NotificationList>(`/v1/notifications?limit=${PAGE_SIZE}`);

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader title="Thông báo" back={{ href: "/groups", label: "Nhóm của tôi" }} />
      <NotificationFeed initial={initial} pageSize={PAGE_SIZE} />
    </Box>
  );
}
