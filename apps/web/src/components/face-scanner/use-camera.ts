"use client";

// Mở camera vào thẻ <video>; đổi camera trước/sau thì mở lại; rời trang thì tắt camera.
import { useEffect, useRef, useState, type RefObject } from "react";

export type Facing = "environment" | "user";

function cameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Chưa được phép dùng camera. Hãy cho phép trình duyệt truy cập camera rồi tải lại trang.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Không tìm thấy camera trên thiết bị này.";
  if (name === "NotReadableError") return "Camera đang được ứng dụng khác sử dụng.";
  return "Không mở được camera. Hãy thử lại.";
}

/** enabled = false: chưa mở (vd. đang tải model). Trả về camera đã chạy chưa, hoặc câu báo lỗi. */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, facing: Facing, enabled: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Trình duyệt này không hỗ trợ camera. Hãy mở bằng Chrome hoặc Safari mới.");
        return;
      }
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(cameraError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, facing, videoRef]);

  // Tắt camera khi rời trang
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { ready, error };
}
