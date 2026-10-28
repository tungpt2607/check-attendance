"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ui } from "./ui";

type Props = {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  /** Nếu có, hỏi xác nhận trước khi gửi */
  confirm?: string;
};

export function SubmitButton({ children, pendingText = "Đang xử lý...", variant = "primary", className = "", confirm }: Props) {
  const { pending } = useFormStatus();
  const base = variant === "danger" ? ui.btnDanger : variant === "ghost" ? ui.btnGhost : ui.btn;
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} ${className}`}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
