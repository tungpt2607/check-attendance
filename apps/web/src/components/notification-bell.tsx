"use client";

// Chuông trên thanh tiêu đề: chấm đỏ = số thông báo chưa đọc (mọi loại).
// Thanh tiêu đề nằm trong layout gốc (không tải lại khi chuyển trang) nên chuông tự hỏi số mới:
// khi chuyển trang, khi quay lại tab trình duyệt, mỗi phút khi đang xem, và khi trang khác báo đã đổi.
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadCountAction } from "@/modules/notifications/notification.actions";
import { brand } from "@/theme/brand";
import { NotificationListView, onNotificationsChanged, useNotificationList } from "./notifications";

const POLL_MS = 60_000;
/** Số thông báo hiện trong chuông; xem hết ở trang /notifications */
const BELL_SIZE = 10;

export function NotificationBell() {
  const pathname = usePathname();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [count, setCount] = useState(0);
  const list = useNotificationList(null, BELL_SIZE);
  const asking = useRef(false);

  const refreshCount = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const n = await getUnreadCountAction();
      if (n !== null) setCount(n);
    } catch {
      // Mạng chập chờn: giữ số cũ
    } finally {
      asking.current = false;
    }
  }, []);

  // Chuyển trang
  useEffect(() => {
    void refreshCount();
  }, [pathname, refreshCount]);

  // Quay lại tab, mỗi phút khi đang xem, trang khác báo đã đổi
  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const onVisible = () => {
      if (visible()) void refreshCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, POLL_MS);
    const off = onNotificationsChanged(() => void refreshCount());
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      off();
    };
  }, [refreshCount]);

  // Số trong danh sách vừa tải là số mới nhất
  const listUnread = list.state?.unreadCount;
  useEffect(() => {
    if (listUnread !== undefined) setCount(listUnread);
  }, [listUnread]);

  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        aria-label={count > 0 ? `Thông báo: ${count} chưa đọc` : "Thông báo"}
        aria-haspopup="dialog"
        onClick={(e) => {
          setAnchor(e.currentTarget);
          void list.reload();
        }}
        sx={{ color: brand.ink }}
      >
        <Badge badgeContent={count} color="error" max={99}>
          <NotificationsNoneRounded />
        </Badge>
      </IconButton>

      <Popover
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 400,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "min(560px, calc(100vh - 96px))",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              mt: 0.5,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, pl: 2, pr: 1, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Thông báo</Typography>
          {count > 0 && (
            <Button size="small" variant="text" onClick={() => list.markRead("all")}>
              Đánh dấu đã đọc tất cả
            </Button>
          )}
        </Box>
        <Divider />
        <Box sx={{ overflowY: "auto", flex: 1 }}>
          <NotificationListView list={list} onNavigate={close} />
        </Box>
        <Divider />
        <Button component={NextLink} href="/notifications" onClick={close} variant="text" sx={{ borderRadius: 0, py: 1.25 }}>
          Xem tất cả thông báo
        </Button>
      </Popover>
    </>
  );
}
