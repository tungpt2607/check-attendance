"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { SubmitButton } from "./submit-button";

type Props = {
  open: boolean;
  onClose: () => void;
  message: string;
  confirmLabel: string;
  pendingText?: string;
  danger?: boolean;
  /** Hành động máy chủ nhận FormData */
  action: (fd: FormData) => Promise<void>;
  /** Các trường ẩn gửi kèm (vd. { memberId }) */
  fields: Record<string, string>;
  successMessage?: string;
  /** Hành động chuyển sang trang khác khi xong (xóa nhóm, xóa buổi): gửi thẳng, không tự đóng */
  redirects?: boolean;
};

/**
 * Hộp xác nhận cho các thao tác trong menu "⋮" (xóa, hủy liên kết...).
 * Cùng giao diện với hộp xác nhận cũ; bấm đồng ý là gửi luôn, nút có vòng xoay trong lúc chờ.
 */
export function ConfirmDialog({ open, onClose, message, confirmLabel, pendingText = "Đang xử lý...", danger, action, fields, successMessage, redirects }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form
        action={
          redirects
            ? action
            : async (fd) => {
                await action(fd);
                onClose();
              }
        }
      >
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>Xác nhận</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={onClose}>
            Hủy
          </Button>
          <SubmitButton variant={danger ? "dangerSolid" : "primary"} pendingText={pendingText} successMessage={successMessage}>
            {confirmLabel}
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
