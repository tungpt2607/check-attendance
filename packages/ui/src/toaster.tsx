"use client";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import { useEffect, useState } from "react";
import { brand } from "./brand";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

const EVENT = "app-toast";
let nextId = 1;

/** Hiện thông báo nhỏ ở cuối màn hình. Gọi được từ bất kỳ thành phần phía trình duyệt nào. */
export function toast(message: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: nextId++, message, kind } }));
}

/** Đặt một lần trong layout; giữ nguyên khi chuyển trang nên thông báo không bị mất. */
export function Toaster() {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [open, setOpen] = useState(false);
  const current = queue[0];

  useEffect(() => {
    const onToast = (e: Event) => setQueue((q) => [...q, (e as CustomEvent<ToastItem>).detail]);
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  useEffect(() => {
    if (current) setOpen(true);
  }, [current]);

  return (
    <Snackbar
      key={current?.id}
      open={open && !!current}
      autoHideDuration={2600}
      onClose={(_e, reason) => reason !== "clickaway" && setOpen(false)}
      slotProps={{ transition: { onExited: () => setQueue((q) => q.slice(1)) } }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: "max(20px, env(safe-area-inset-bottom))" } }}
    >
      <SnackbarContent
        sx={{
          bgcolor: current?.kind === "error" ? brand.red : brand.ink,
          color: "#fff",
          borderRadius: 999,
          minWidth: "auto !important",
          px: 2,
          fontWeight: 500,
        }}
        message={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {current?.kind === "error" ? (
              <ErrorRounded fontSize="small" />
            ) : (
              <CheckCircleRounded fontSize="small" sx={{ color: brand.teal }} />
            )}
            {current?.message}
          </span>
        }
      />
    </Snackbar>
  );
}
