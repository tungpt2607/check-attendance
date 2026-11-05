"use client";

// Hộp thoại làm một việc: nội dung tùy ý (ô nhập, ô chọn...), nút Hủy + nút xác nhận có trạng thái đang xử lý,
// lỗi từ máy chủ hiện ngay trong hộp thoại. onConfirm trả { ok } hoặc { ok: false, error }.
// Khác ConfirmDialog (gửi form, dùng cho thao tác đơn giản): dùng khi cần dữ liệu từ ô nhập/ô chọn trong hộp thoại.
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { Theme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "./toaster";

/** keepOpen: xong nhưng chưa đóng (vd. vừa tạo link, cần hiện ra để chia sẻ) */
export type TaskResult = { ok: true; keepOpen?: boolean } | { ok: false; error: string };

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  pendingText?: string;
  danger?: boolean;
  /** Tắt nút xác nhận (vd. chưa nhập email) */
  disabled?: boolean;
  /** Chạy khi bấm xác nhận; thành công thì đóng hộp thoại và hiện successMessage */
  onConfirm: () => Promise<TaskResult | void>;
  successMessage?: string;
  /** Ẩn nút xác nhận (hộp thoại chỉ để xem, vd. hiện link vừa tạo) */
  hideConfirm?: boolean;
  closeLabel?: string;
  /** Nội dung dài (vd. danh sách quyền): trên điện thoại hiện toàn màn hình, nút luôn ở đáy */
  fullScreenOnMobile?: boolean;
};

export function TaskDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  pendingText = "Đang xử lý...",
  danger = false,
  disabled = false,
  onConfirm,
  successMessage,
  hideConfirm = false,
  closeLabel = "Hủy",
  fullScreenOnMobile = false,
}: Props) {
  const isPhone = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setError(null);
    onClose();
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await onConfirm();
      if (res && !res.ok) {
        setError(res.error);
        return;
      }
      if (res?.keepOpen) return;
      if (successMessage) toast(successMessage);
      onClose();
    });
  };

  return (
    // scroll="paper": nội dung cuộn bên trong, tiêu đề và nút luôn thấy (không lệch chỗ chạm khi bàn phím điện thoại bật)
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth scroll="paper" fullScreen={fullScreenOnMobile && isPhone}
      slotProps={{ paper: { sx: fullScreenOnMobile && isPhone ? { borderRadius: 0 } : undefined } }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {children}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, pb: "max(12px, env(safe-area-inset-bottom))" }}>
        <Button color="inherit" onClick={close} disabled={pending}>
          {closeLabel}
        </Button>
        {!hideConfirm && (
          <Button
            variant="contained"
            color={danger ? "error" : "primary"}
            onClick={confirm}
            disabled={disabled || pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {pending ? pendingText : confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
