"use client";

import { useEffect, useState } from "react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

const EVENT = "app-toast";
let nextId = 1;

/** Hiện thông báo nhỏ ở cuối màn hình. Gọi được từ bất kỳ thành phần phía trình duyệt nào. */
export function toast(message: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: nextId++, message, kind } }));
}

const DURATION_MS = 2800;

/** Đặt một lần trong layout; giữ nguyên khi chuyển trang nên thông báo không bị mất. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setItems((list) => [...list.slice(-2), item]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== item.id)), DURATION_MS);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex animate-[toast-in_0.2s_ease-out] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            t.kind === "error" ? "bg-danger-600" : "bg-ink"
          }`}
        >
          <span aria-hidden="true">{t.kind === "error" ? "!" : "✓"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
