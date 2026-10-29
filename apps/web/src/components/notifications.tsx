"use client";

// Thông báo dùng chung cho chuông (thanh tiêu đề) và trang /notifications.
// Câu chữ, biểu tượng, đường dẫn, nút thao tác của từng loại lấy từ cấu hình chung
// @check-attendance/shared/notifications — thêm loại mới không cần sửa file này
// (trừ khi có kiểu nút thao tác mới hoặc biểu tượng mới).
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import HighlightOffRounded from "@mui/icons-material/HighlightOffRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import type { NotificationItem } from "@check-attendance/shared/api";
import { timeAgo } from "@check-attendance/shared/format";
import {
  NOTIFICATION_CONFIG,
  RESOLUTION_LABELS,
  type NotificationConfig,
  type NotificationIcon,
} from "@check-attendance/shared/notifications";
import NextLink from "next/link";
import { useCallback, useState, useTransition } from "react";
import { decideRequestAction } from "@/modules/invites/invite.actions";
import { listNotificationsAction, markNotificationsReadAction } from "@/modules/notifications/notification.actions";
import { brand } from "@check-attendance/ui/brand";
import { Avatar } from "@check-attendance/ui/avatar";
import { toast } from "@check-attendance/ui/toaster";

// ---------- Báo cho chuông biết số chưa đọc đã đổi (thao tác ở trang khác) ----------

const CHANGED_EVENT = "ca:notifications-changed";

export function emitNotificationsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function onNotificationsChanged(fn: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, fn);
  return () => window.removeEventListener(CHANGED_EVENT, fn);
}

// ---------- Hình và màu ----------

const ICONS: Record<NotificationIcon, SvgIconComponent> = {
  person_add: PersonAddAlt1Rounded,
  check: CheckCircleOutlineRounded,
  close: HighlightOffRounded,
};

const TONES: Record<NotificationConfig["tone"], { fg: string; bg: string }> = {
  primary: { fg: brand.orangeDark, bg: brand.orangeLight },
  success: { fg: brand.tealDark, bg: brand.tealLight },
  error: { fg: brand.red, bg: brand.redLight },
};

// ---------- Danh sách + thao tác ----------

type ListState = { items: NotificationItem[]; nextCursor: string | null; unreadCount: number };

/** Dữ liệu và thao tác của một danh sách thông báo (chuông hoặc trang) */
export function useNotificationList(initial: ListState | null, pageSize: number) {
  const [state, setState] = useState<ListState | null>(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const res = await listNotificationsAction(null, pageSize).catch(() => null);
    if (res) setState(res);
    return res;
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (!state?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await listNotificationsAction(state.nextCursor, pageSize).catch(() => null);
    setLoadingMore(false);
    if (!res) return toast("Không tải được thông báo. Vui lòng thử lại.", "error");
    setState((s) => (s ? { items: [...s.items, ...res.items], nextCursor: res.nextCursor, unreadCount: res.unreadCount } : res));
  }, [state?.nextCursor, loadingMore, pageSize]);

  /** Đánh dấu đã đọc ngay trên màn hình, gửi lên máy chủ phía sau */
  const markRead = useCallback((ids: string[] | "all") => {
    setState((s) => {
      if (!s) return s;
      const hit = (n: NotificationItem) => !n.read && (ids === "all" || ids.includes(n.id));
      const changed = s.items.filter(hit).length;
      return {
        ...s,
        items: s.items.map((n) => (hit(n) ? { ...n, read: true } : n)),
        unreadCount: ids === "all" ? 0 : Math.max(0, s.unreadCount - changed),
      };
    });
    void markNotificationsReadAction(ids)
      .catch(() => undefined)
      .then(emitNotificationsChanged);
  }, []);

  /** Nút Duyệt / Từ chối trên thông báo yêu cầu nhận tên */
  const decide = useCallback(
    (n: NotificationItem, approve: boolean) => {
      if (busyId || n.subject?.kind !== "link_request") return;
      setBusyId(n.id);
      startTransition(async () => {
        try {
          const res = await decideRequestAction(n.subject!.id, approve);
          if (res.ok) toast(approve ? "Đã duyệt" : "Đã từ chối");
          else toast(res.error, "error");
        } catch {
          toast("Có lỗi xảy ra. Vui lòng thử lại.", "error");
        }
        // Lấy lại kết quả thật từ máy chủ (đã duyệt, đã từ chối, hay người khác xử lý trước)
        await reload();
        emitNotificationsChanged();
        setBusyId(null);
      });
    },
    [busyId, reload],
  );

  return { state, reload, loadMore, loadingMore, markRead, decide, busyId };
}

export type NotificationListApi = ReturnType<typeof useNotificationList>;

/** Một dòng thông báo */
function NotificationRow({
  n,
  list,
  onNavigate,
  divider,
}: {
  n: NotificationItem;
  list: NotificationListApi;
  onNavigate?: () => void;
  divider: boolean;
}) {
  const config = NOTIFICATION_CONFIG[n.type];
  const href = config.href(n);
  const Icon = ICONS[config.icon];
  const tone = TONES[config.tone];
  const busy = list.busyId === n.id;
  const showActions = config.actions === "approve_reject" && !n.resolution;

  const open = () => {
    if (!n.read) list.markRead([n.id]);
    if (href) onNavigate?.();
  };

  const body = (
    <>
      {/* Ảnh người gây ra sự việc kèm biểu tượng loại; không có người thì chỉ có biểu tượng */}
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        {n.actor ? (
          <Avatar userId={n.actor.id} name={n.actor.name} version={n.actor.avatarVersion} size={40} />
        ) : (
          <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: tone.bg, color: tone.fg, display: "grid", placeItems: "center" }}>
            <Icon sx={{ fontSize: 22 }} />
          </Box>
        )}
        {n.actor && (
          <Box
            sx={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 20,
              height: 20,
              borderRadius: "50%",
              bgcolor: tone.bg,
              color: tone.fg,
              border: "2px solid #fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon sx={{ fontSize: 12 }} />
          </Box>
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ color: brand.ink, lineHeight: 1.45 }}>
          {config.text(n).map((p, i) =>
            p.bold ? (
              <Box component="b" key={i} sx={{ fontWeight: 600 }}>
                {p.text}
              </Box>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </Typography>
        <Typography variant="caption" sx={{ color: n.read ? "text.secondary" : brand.tealDark, fontWeight: n.read ? 400 : 600 }} suppressHydrationWarning>
          {timeAgo(n.createdAt)}
          {config.actions && n.resolution && (
            <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>
              {` · ${RESOLUTION_LABELS[n.resolution]}`}
            </Box>
          )}
        </Typography>
      </Box>
      {!n.read && <Box aria-label="Chưa đọc" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: brand.teal, flexShrink: 0, mt: 0.75 }} />}
    </>
  );

  const rowSx = { display: "flex", alignItems: "flex-start", gap: 1.5, width: "100%", textAlign: "left", px: 2, py: 1.5 } as const;

  return (
    <Box
      component="li"
      className="ca-fade-in"
      sx={{ bgcolor: n.read ? "transparent" : brand.tealLighter, borderTop: divider ? `1px solid ${brand.border}` : "none" }}
    >
      {href ? (
        <ButtonBase component={NextLink} href={href} onClick={open} sx={rowSx}>
          {body}
        </ButtonBase>
      ) : (
        <ButtonBase component="div" onClick={open} sx={{ ...rowSx, cursor: n.read ? "default" : "pointer" }}>
          {body}
        </ButtonBase>
      )}
      {showActions && (
        <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1.5, pl: 9 }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            disabled={!!list.busyId}
            startIcon={<CloseRounded />}
            onClick={() => list.decide(n, false)}
          >
            Từ chối
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!!list.busyId}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckRounded />}
            onClick={() => list.decide(n, true)}
          >
            Duyệt
          </Button>
        </Stack>
      )}
    </Box>
  );
}

/** Danh sách thông báo: đang tải / trống / các dòng + "Xem thêm" (tùy chọn) */
export function NotificationListView({
  list,
  onNavigate,
  showMore = false,
}: {
  list: NotificationListApi;
  onNavigate?: () => void;
  showMore?: boolean;
}) {
  const { state } = list;
  if (!state) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (state.items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 4, textAlign: "center" }}>
        Chưa có thông báo nào.
      </Typography>
    );
  }
  return (
    <>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {state.items.map((n, i) => (
          <NotificationRow key={n.id} n={n} list={list} onNavigate={onNavigate} divider={i > 0} />
        ))}
      </Box>
      {showMore && state.nextCursor && (
        <Box sx={{ p: 1.5, textAlign: "center" }}>
          <Button variant="text" onClick={() => void list.loadMore()} disabled={list.loadingMore}>
            {list.loadingMore ? "Đang tải..." : "Xem thêm"}
          </Button>
        </Box>
      )}
    </>
  );
}
