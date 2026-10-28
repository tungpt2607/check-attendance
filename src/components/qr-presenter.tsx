"use client";

import { useEffect, useState } from "react";
import { getQrStateAction, type QrState } from "@/modules/attendance/attendance.actions";

const REFRESH_MS = 10_000;

/** Hiện mã QR tự điểm danh, tự lấy mã mới và số người đã điểm danh mỗi 10 giây. */
export function QrPresenter({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<QrState | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const next = await getQrStateAction(sessionId);
        if (alive) {
          setState(next);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [sessionId]);

  if (!state) {
    return <div className="grid aspect-square w-full place-items-center rounded-2xl bg-slate-100 text-slate-500">Đang tạo mã QR...</div>;
  }
  if (!state.open) {
    return <p className="rounded-lg bg-slate-100 p-6 text-center text-slate-600">Tự điểm danh đã đóng.</p>;
  }

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.qrDataUrl}
        alt="Mã QR tự điểm danh"
        className="mx-auto aspect-square w-full max-w-md rounded-2xl border border-slate-200 bg-white p-3"
      />
      <div className="text-center">
        <p className="text-4xl font-bold text-indigo-600">
          {state.checkedIn}
          <span className="text-2xl font-medium text-slate-400"> / {state.total}</span>
        </p>
        <p className="text-sm text-slate-500">người đã điểm danh</p>
      </div>
      <p className="text-center text-xs text-slate-400">
        Mã tự đổi mỗi 30 giây{error && " · Mất kết nối, đang thử lại..."}
      </p>
    </div>
  );
}
