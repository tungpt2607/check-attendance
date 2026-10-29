"use client";

import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQrStateAction, type QrState } from "@/modules/attendance/attendance.actions";
import { brand } from "@check-attendance/ui/brand";

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
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", borderRadius: 4, bgcolor: "#EDF1F1", color: "text.secondary" }}>
        Đang tạo mã QR...
      </Box>
    );
  }
  if (!state.open) {
    return (
      <Box sx={{ flex: 1, borderRadius: 3, bgcolor: "#EDF1F1", p: 3, textAlign: "center", color: "text.secondary" }}>
        Tự điểm danh đã đóng.
      </Box>
    );
  }

  const seconds = Math.ceil(remainingMs / 1000);
  const percent = Math.min(100, (remainingMs / WINDOW_MS) * 100);
  const urgent = seconds <= 5;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flex: 1, minHeight: 0 }}>
      {/* QR tự co theo phần chiều cao còn lại của màn hình */}
      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.qrDataUrl}
          alt="Mã QR tự điểm danh"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Box>

      <Box>
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{
            height: 8,
            borderRadius: 4,
            "& .MuiLinearProgress-bar": { bgcolor: urgent ? brand.orange : brand.teal, transition: "transform 200ms linear" },
          }}
        />
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1.5, mt: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: urgent ? brand.orangeDark : "text.secondary" }}
          >
            {seconds > 0 ? `Mã mới sau ${seconds}s` : "Đang đổi mã..."}
            {error && (
              <Typography component="span" variant="caption" sx={{ display: "block", color: brand.orangeDark }}>
                Mất kết nối, đang thử lại...
              </Typography>
            )}
          </Typography>
          <Box sx={{ textAlign: "right", lineHeight: 1 }}>
            <Typography component="span" sx={{ fontSize: 30, fontWeight: 800, color: brand.tealDark, fontVariantNumeric: "tabular-nums" }}>
              {state.checkedIn}
            </Typography>
            <Typography component="span" sx={{ fontSize: 18, fontWeight: 600, color: "text.disabled" }}>
              /{state.total}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", pt: 0.5 }}>
              đã điểm danh
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
