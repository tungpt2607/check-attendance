"use client";

import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/theme/brand";

/** Chạy nhanh lúc đầu rồi chậm dần, dừng ở 85% đến khi trang mới hiện */
const grow = keyframes`
  from { width: 0%; }
  to { width: 85%; }
`;

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
    <Box sx={{ pointerEvents: "none", position: "fixed", insetInline: 0, top: 0, zIndex: 1600, height: 3 }}>
      <Box
        sx={{
          height: "100%",
          bgcolor: brand.teal,
          boxShadow: `0 0 8px ${brand.teal}`,
          ...(state === "loading"
            ? { animation: `${grow} 8s cubic-bezier(0.1,0.7,0.2,1) forwards` }
            : { width: "100%", opacity: 0, transition: "opacity 300ms" }),
        }}
      />
    </Box>
  );
}
