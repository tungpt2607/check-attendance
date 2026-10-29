"use client";

import { useRef } from "react";

/** Ngón tay xê dịch quá khoảng này thì coi là đang vuốt cuộn, không phải bấm */
const MOVE_TOLERANCE = 10;

/**
 * Nhận lệnh ngay khi ngón tay nhấc lên.
 * Trên iPhone, chạm lúc trang còn đang trôi sau khi vuốt thì trình duyệt không gửi "click",
 * nên nút phải bấm 2 lần. Bắt sự kiện nhấc tay giúp bấm 1 lần là ăn.
 * Chuột và bàn phím vẫn đi qua onClick như bình thường; không chạy 2 lần cho cùng một cú bấm.
 */
export function useFastTap(onTap: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const handled = useRef(false);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
    },
    onPointerCancel: () => {
      start.current = null;
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      if (Math.abs(e.clientX - s.x) > MOVE_TOLERANCE || Math.abs(e.clientY - s.y) > MOVE_TOLERANCE) return;
      handled.current = true;
      // Nếu trình duyệt không gửi click sau đó (trang đang trôi) thì cờ tự hết hạn
      setTimeout(() => (handled.current = false), 600);
      onTap();
    },
    onClick: () => {
      if (handled.current) {
        handled.current = false;
        return;
      }
      onTap();
    },
  };
}
