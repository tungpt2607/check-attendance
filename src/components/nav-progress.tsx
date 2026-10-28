"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thanh tiến trình mảnh ở mép trên màn hình: chạy ngay khi bấm một liên kết trong web,
 * hoàn tất khi trang mới hiện ra.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bắt đầu khi bấm liên kết nội bộ sang trang khác
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setState("loading");
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => setState("done"), 15_000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Trang đã đổi (kể cả do chuyển hướng sau khi gửi biểu mẫu): hoàn tất
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
  }, [pathname]);

  useEffect(() => {
    if (state !== "done") return;
    if (safety.current) clearTimeout(safety.current);
    const t = setTimeout(() => setState("idle"), 400);
    return () => clearTimeout(t);
  }, [state]);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className={`h-full bg-brand-400 shadow-[0_0_8px_rgba(84,182,185,0.7)] ${
          state === "loading" ? "animate-[nav-progress_8s_cubic-bezier(0.1,0.7,0.2,1)_forwards]" : "w-full opacity-0 transition-opacity duration-300"
        }`}
      />
    </div>
  );
}
