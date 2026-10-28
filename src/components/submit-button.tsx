"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "./toaster";

type Props = {
  children: ReactNode;
  pendingText?: string;
  /** primary: nút chính; ghost: viền; danger: xóa; plain: chữ không viền */
  variant?: "primary" | "ghost" | "danger" | "plain";
  className?: string;
  sx?: ButtonProps["sx"];
  fullWidth?: boolean;
  size?: ButtonProps["size"];
  startIcon?: ReactNode;
  /** Nếu có, hỏi xác nhận bằng hộp thoại trước khi gửi */
  confirm?: string;
  /** Chữ trên nút đồng ý trong hộp xác nhận */
  confirmLabel?: string;
  /** Nếu có, hiện thông báo nhỏ khi thao tác xong */
  successMessage?: string;
};

const VARIANTS: Record<NonNullable<Props["variant"]>, Pick<ButtonProps, "variant" | "color">> = {
  primary: { variant: "contained", color: "primary" },
  ghost: { variant: "outlined", color: "inherit" },
  danger: { variant: "outlined", color: "error" },
  plain: { variant: "text", color: "inherit" },
};

/** Nút gửi biểu mẫu: vòng xoay và khóa trong lúc chờ, hộp xác nhận tùy chọn, báo "đã xong". */
export function SubmitButton({
  children,
  pendingText = "Đang xử lý...",
  variant = "primary",
  className,
  sx,
  fullWidth,
  size,
  startIcon,
  confirm,
  confirmLabel,
  successMessage,
}: Props) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [asking, setAsking] = useState(false);
  const wasPending = useRef(false);
  const messageRef = useRef(successMessage);
  messageRef.current = successMessage;

  // Xong việc mà nút vẫn còn trên trang
  useEffect(() => {
    if (wasPending.current && !pending && successMessage) toast(successMessage);
    wasPending.current = pending;
  }, [pending, successMessage]);

  // Xong việc làm nút biến mất (hộp sửa tự đóng, dòng bị xóa, chuyển sang trang khác): vẫn báo
  useEffect(
    () => () => {
      if (wasPending.current && messageRef.current) toast(messageRef.current);
    },
    [],
  );

  const submitConfirmed = () => {
    setAsking(false);
    const btn = buttonRef.current;
    // Gửi biểu mẫu với chính nút này làm nút bấm (không đi qua onClick nên không hỏi lại)
    btn?.form?.requestSubmit(btn);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={className}
        sx={sx}
        fullWidth={fullWidth}
        size={size}
        {...VARIANTS[variant]}
        startIcon={pending ? <CircularProgress size={16} color="inherit" /> : startIcon}
        onClick={(e) => {
          if (confirm) {
            e.preventDefault();
            setAsking(true);
          }
        }}
      >
        {pending ? pendingText : children}
      </Button>

      {confirm && (
        <Dialog open={asking} onClose={() => setAsking(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>Xác nhận</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirm}</DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAsking(false)} color="inherit">
              Hủy
            </Button>
            <Button
              onClick={submitConfirmed}
              variant="contained"
              color={variant === "danger" || variant === "plain" ? "error" : "primary"}
              autoFocus
            >
              {confirmLabel ?? "Đồng ý"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
