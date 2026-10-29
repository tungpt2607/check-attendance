"use client";

// Chuông trên thanh tiêu đề: yêu cầu liên kết tài khoản đang chờ duyệt ở mọi nhóm tôi quản lý.
// Thanh tiêu đề nằm trong layout gốc (không tải lại khi chuyển trang) nên chuông tự lấy số mới:
// khi mở trang / chuyển trang, khi quay lại tab trình duyệt, và mỗi phút khi đang xem.
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { OwnerRequestRow } from "@check-attendance/shared/api";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { approveRequestAction, getPendingRequestsAction, rejectRequestAction } from "@/modules/invites/invite.actions";
import { brand } from "@/theme/brand";
import { Avatar } from "./avatar";
import { toast } from "./toaster";

const POLL_MS = 60_000;

export function RequestBell() {
  const pathname = usePathname();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [requests, setRequests] = useState<OwnerRequestRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const list = await getPendingRequestsAction();
      if (list) setRequests(list);
    } catch {
      // Mạng chập chờn: giữ số cũ, lần sau lấy lại
    } finally {
      loading.current = false;
    }
  }, []);

  // Mở trang / chuyển trang
  useEffect(() => {
    void load();
  }, [pathname, load]);

  // Quay lại tab + mỗi phút khi đang xem
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [load]);

  const count = requests?.length ?? 0;
  const close = () => setAnchor(null);

  function decide(r: OwnerRequestRow, approve: boolean) {
    if (busyId) return;
    setBusyId(r.id);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("requestId", r.id);
      try {
        await (approve ? approveRequestAction(fd) : rejectRequestAction(fd));
        toast(approve ? "Đã duyệt" : "Đã từ chối");
      } catch {
        toast("Có lỗi xảy ra. Vui lòng thử lại.", "error");
      }
      await load();
      setBusyId(null);
    });
  }

  return (
    <>
      <IconButton
        aria-label={count > 0 ? `Thông báo: ${count} yêu cầu chờ duyệt` : "Thông báo"}
        aria-haspopup="dialog"
        onClick={(e) => {
          setAnchor(e.currentTarget);
          void load();
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
          paper: { sx: { width: 380, maxWidth: "calc(100vw - 32px)", maxHeight: "min(520px, calc(100vh - 96px))", borderRadius: 2, mt: 0.5 } },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>Yêu cầu chờ duyệt{count > 0 ? ` (${count})` : ""}</Typography>
          <Typography variant="body2" color="text.secondary">
            Người xin nhận tên trong nhóm bạn quản lý qua link tham gia
          </Typography>
        </Box>
        <Divider />

        {requests === null ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : count === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: "center" }}>
            Không có yêu cầu nào đang chờ duyệt.
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {requests.map((r, i) => {
              const acc = r.account;
              const busy = busyId === r.id;
              return (
                <Box component="li" key={r.id} className="ca-fade-in">
                  {i > 0 && <Divider />}
                  <Box sx={{ px: 2, py: 1.5 }}>
                    {/* Bấm vào phần chữ: mở tab Thành viên của nhóm đó */}
                    <ButtonBase
                      component={NextLink}
                      href={`/groups/${r.groupId}?tab=members`}
                      onClick={close}
                      sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, width: "100%", textAlign: "left", borderRadius: 1 }}
                    >
                      <Avatar userId={acc?.id ?? ""} name={acc?.name ?? "?"} version={acc?.avatarVersion ?? null} size={36} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontWeight: 600 }}>
                          {acc?.name ?? "Tài khoản"}
                        </Typography>
                        {acc?.email && (
                          <Typography noWrap variant="body2" color="text.secondary">
                            {acc.email}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ mt: 0.25 }}>
                          Xin nhận tên <b>{r.memberName ?? "(đã xóa)"}</b> · nhóm <b>{r.groupName}</b>
                        </Typography>
                      </Box>
                    </ButtonBase>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.25, justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={!!busyId}
                        startIcon={<CloseRounded />}
                        onClick={() => decide(r, false)}
                      >
                        Từ chối
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!!busyId}
                        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckRounded />}
                        onClick={() => decide(r, true)}
                      >
                        Duyệt
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>
    </>
  );
}
