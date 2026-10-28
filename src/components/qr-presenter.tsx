"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQrStateAction, type QrState } from "@/modules/attendance/attendance.actions";

/** Mỗi mã hiển thị 30 giây (khớp QR_WINDOW_MS phía máy chủ) */
const WINDOW_MS = 30_000;
/** Cập nhật số người đã điểm danh */
const COUNT_REFRESH_MS = 10_000;

type OpenState = Extract<QrState, { open: true }>;

/**
 * Hiện mã QR tự điểm danh kèm đếm ngược tới lúc đổi mã.
 * Đồng hồ được đồng bộ theo giờ máy chủ, hết giờ là lấy mã mới ngay.
 */
export function QrPresenter({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<QrState | null>(null);
  const [error, setError] = useState(false);
  const [remainingMs, setRemainingMs] = useState(WINDOW_MS);
  /** Chênh lệch giờ máy chủ - giờ điện thoại */
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const stateRef = useRef<QrState | null>(null);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next = await getQrStateAction(sessionId);
      if (next.open) offsetRef.current = next.serverNow - Date.now();
      stateRef.current = next;
      setState(next);
      setError(false);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
    }
  }, [sessionId]);

  // Lấy mã lần đầu và cập nhật số người định kỳ
  useEffect(() => {
    load();
    const timer = setInterval(load, COUNT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Đếm ngược; về 0 thì lấy mã mới ngay
  useEffect(() => {
    const tick = setInterval(() => {
      const s = stateRef.current;
      if (!s || !s.open) return;
      const left = (s as OpenState).windowEndsAt - (Date.now() + offsetRef.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0) load();
    }, 250);
    return () => clearInterval(tick);
  }, [load]);

  if (!state) {
    return <div className="grid min-h-0 flex-1 place-items-center rounded-2xl bg-slate-100 text-slate-500">Đang tạo mã QR...</div>;
  }
  if (!state.open) {
    return <p className="flex-1 rounded-lg bg-slate-100 p-6 text-center text-slate-600">Tự điểm danh đã đóng.</p>;
  }

  const seconds = Math.ceil(remainingMs / 1000);
  const percent = Math.min(100, (remainingMs / WINDOW_MS) * 100);
  const urgent = seconds <= 5;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* QR tự co theo phần chiều cao còn lại của màn hình */}
      <div className="relative min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.qrDataUrl} alt="Mã QR tự điểm danh" className="absolute inset-0 h-full w-full object-contain" />
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-linear ${urgent ? "bg-warn-400" : "bg-brand-400"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className={`text-sm font-medium tabular-nums ${urgent ? "text-warn-600" : "text-slate-600"}`}>
            {seconds > 0 ? `Mã mới sau ${seconds}s` : "Đang đổi mã..."}
            {error && <span className="block text-xs text-warn-600">Mất kết nối, đang thử lại...</span>}
          </p>
          <p className="text-right leading-none">
            <span className="text-3xl font-bold tabular-nums text-brand-600">{state.checkedIn}</span>
            <span className="text-lg font-medium text-slate-400">/{state.total}</span>
            <span className="block pt-1 text-xs text-slate-500">đã điểm danh</span>
          </p>
        </div>
      </div>
    </div>
  );
}
