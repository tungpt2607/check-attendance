"use client";

// Nút gọi một hành động máy chủ trả về kết quả { ok, message }: hỏi xác nhận (tùy chọn),
// vòng xoay khi chờ, báo kết quả bằng thông báo nhỏ, rồi làm mới dữ liệu trang.
import Button, { type ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "./toaster";

/** Kết quả chung của các hành động máy chủ dùng với ActionButton */
export type ActionResult = { ok: true; message?: string; redirectTo?: string } | { ok: false; message: string };

type Props = {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  /** Câu hỏi xác nhận; bỏ trống = làm ngay */
  confirm?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  variant?: ButtonProps["variant"];
  startIcon?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: ButtonProps["size"];
};

export function ActionButton({
  action,
  children,
  confirm,
  confirmLabel = "Đồng ý",
  danger,
  variant = "outlined",
  startIcon,
  disabled,
  fullWidth,
  size,
}: Props) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setAsking(false);
    startTransition(async () => {
      try {
        const res = await action();
        if (res.ok) {
          if (res.message) toast(res.message);
          if (res.redirectTo) router.push(res.redirectTo);
          else router.refresh();
        } else {
          toast(res.message, "error");
        }
      } catch {
        toast("Có lỗi xảy ra. Vui lòng thử lại.", "error");
      }
    });
  };

  return (
    <>
      <Button
        variant={variant}
        color={danger ? "error" : variant === "contained" ? "primary" : "inherit"}
        startIcon={pending ? <CircularProgress size={16} color="inherit" /> : startIcon}
        disabled={disabled || pending}
        fullWidth={fullWidth}
        size={size}
        onClick={() => (confirm ? setAsking(true) : run())}
      >
        {children}
      </Button>
      {confirm && (
        <Dialog open={asking} onClose={() => setAsking(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>Xác nhận</DialogTitle>
          <DialogContent>
            <DialogContentText component="div">{confirm}</DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setAsking(false)}>
              Hủy
            </Button>
            <Button variant="contained" color={danger ? "error" : "primary"} onClick={run} autoFocus>
              {confirmLabel}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
