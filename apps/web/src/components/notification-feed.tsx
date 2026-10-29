"use client";

// Danh sách thông báo đầy đủ ở trang /notifications ("Xem thêm" mỗi lần một trang)
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type { NotificationList } from "@check-attendance/shared/api";
import { NotificationListView, useNotificationList } from "./notifications";

export function NotificationFeed({ initial, pageSize }: { initial: NotificationList; pageSize: number }) {
  const list = useNotificationList(initial, pageSize);
  const unread = list.state?.unreadCount ?? 0;

  return (
    <Card sx={{ overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, pl: 2, pr: 1, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          {unread > 0 ? `${unread} chưa đọc` : "Đã đọc hết"}
        </Typography>
        {unread > 0 && (
          <Button size="small" variant="text" onClick={() => list.markRead("all")}>
            Đánh dấu đã đọc tất cả
          </Button>
        )}
      </Box>
      <NotificationListView list={list} showMore />
    </Card>
  );
}
