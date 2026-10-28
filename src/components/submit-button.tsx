"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";
import { toast } from "./toaster";
import { ui } from "./ui";

type Props = {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "ghost" | "danger" | "plain";
  className?: string;
  /** Nếu có, hỏi xác nhận trước khi gửi */
  confirm?: string;
  /** Nếu có, hiện thông báo nhỏ khi thao tác xong (nút vẫn còn trên trang, tức là không chuyển trang) */
  successMessage?: string;
};

/** Nút gửi biểu mẫu: hiện vòng xoay và khóa trong lúc chờ, tùy chọn báo "đã xong". */
export function SubmitButton({
  children,
  pendingText = "Đang xử lý...",
  variant = "primary",
  className = "",
  confirm,
  successMessage,
}: Props) {
  const { pending } = useFormStatus();
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

  const base =
    variant === "danger" ? ui.btnDanger : variant === "ghost" ? ui.btnGhost : variant === "plain" ? "" : ui.btn;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${base} ${variant === "plain" ? "inline-flex items-center gap-1" : ""} ${className}`}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <Spinner />}
      {pending ? pendingText : children}
    </button>
  );
}
