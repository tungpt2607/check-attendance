"use client";

// Vòng dò khuôn mặt trên khung hình camera: kiểm tra chất lượng rồi mới báo một khuôn mặt "đủ tốt" để gửi đi.
// - đủ gần (chiếm đủ bề ngang khung hình), đủ rõ (độ tin cậy), đứng yên (3 khung liên tiếp giống nhau, gửi trung bình)
// - bỏ qua người vừa quét xong vẫn còn đứng trước camera
import { useEffect, useRef, useState, type RefObject } from "react";
import { brand } from "@check-attendance/ui/brand";
import { faceDistance, type FaceApiModule, type FaceBox } from "./face-model";

/** Khoảng nghỉ giữa hai lần dò khuôn mặt */
const SCAN_INTERVAL_MS = 250;
/** Độ tin cậy tối thiểu của khung khuôn mặt (khuôn mặt hơi nghiêng thường khoảng 0.6–0.7) */
const MIN_SCORE = 0.6;
/** Khuôn mặt phải chiếm ít nhất ngần này bề ngang khung hình (đủ gần để nhận diện chính xác) */
const MIN_FACE_RATIO = 0.18;
/** Các khung hình liên tiếp phải giống nhau ngần này mới gộp lại (tránh ảnh nhòe khi đang di chuyển) */
const STABLE_DISTANCE = 0.4;
/** Gộp (lấy trung bình) ngần này khung hình đứng yên rồi mới gửi: vector ổn định hơn một khung lẻ, ít nhận nhầm hơn */
const FRAMES_PER_SCAN = 3;
/** Kích thước ảnh đưa vào bộ dò: lớn hơn thì mốc khuôn mặt chuẩn hơn (vector chính xác hơn), chậm hơn chút */
const DETECTOR_INPUT_SIZE = 416;

/** Trung bình cộng các vector */
function average(list: Float32Array[]): Float32Array {
  const out = new Float32Array(list[0]!.length);
  for (const v of list) for (let i = 0; i < out.length; i++) out[i]! += v[i]! / list.length;
  return out;
}

export const HINT_IDLE = "Hướng camera vào khuôn mặt từng người";

type Options = {
  faceapi: FaceApiModule | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  /** Chỉ dò khi đang ở trạng thái quét (không dò khi đang gửi, đang hiện kết quả, đang chọn tên) */
  active: boolean;
  /** Khuôn mặt này vừa xử lý xong (bỏ qua) */
  isRecent: (descriptor: Float32Array) => boolean;
  /** Có một khuôn mặt đủ tốt; vòng dò dừng cho tới khi active bật lại */
  onFace: (descriptor: Float32Array, box: FaceBox) => void;
};

/** Trả về câu gợi ý cho người cầm camera */
export function useFaceDetection({ faceapi, videoRef, overlayRef, active, isRecent, onFace }: Options): string {
  const [hint, setHint] = useState(HINT_IDLE);
  // Gọi bản mới nhất của hàm do nơi dùng truyền vào mà không phải khởi động lại vòng dò
  const callbacks = useRef({ isRecent, onFace });
  callbacks.current = { isRecent, onFace };

  useEffect(() => {
    if (!active || !faceapi) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    /** Các khung hình đứng yên liên tiếp của cùng một khuôn mặt */
    let frames: Float32Array[] = [];

    const draw = (box: FaceBox | null, ok: boolean) => {
      const canvas = overlayRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!box) return;
      ctx.lineWidth = Math.max(3, canvas.width / 160);
      ctx.strokeStyle = ok ? brand.teal : brand.orange;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    };

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || !video) return;
      if (video.readyState < 2 || !video.videoWidth) {
        timer = setTimeout(tick, SCAN_INTERVAL_MS);
        return;
      }
      try {
        const found = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: DETECTOR_INPUT_SIZE, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (stopped) return;
        if (!found) {
          draw(null, false);
          frames = [];
          setHint(HINT_IDLE);
        } else {
          const box = found.detection.box;
          const bigEnough = box.width >= video.videoWidth * MIN_FACE_RATIO;
          const clear = found.detection.score >= MIN_SCORE;
          const seen = callbacks.current.isRecent(found.descriptor);
          draw(box, bigEnough && clear && !seen);
          if (seen) {
            setHint("Đã quét người này. Chuyển sang người tiếp theo");
            frames = [];
          } else if (!bigEnough) {
            setHint("Đưa camera lại gần hơn");
            frames = [];
          } else if (!clear) {
            setHint("Giữ yên, nhìn thẳng vào camera");
            frames = [];
          } else {
            // Khác hẳn khung trước (đổi người / nhòe): bắt đầu gộp lại từ đầu
            if (frames.length && faceDistance(average(frames), found.descriptor) >= STABLE_DISTANCE) frames = [];
            frames.push(found.descriptor);
            if (frames.length >= FRAMES_PER_SCAN) {
              draw(null, false);
              callbacks.current.onFace(average(frames), box);
              return;
            }
            setHint("Giữ yên...");
          }
        }
      } catch (err) {
        console.error(err);
      }
      timer = setTimeout(tick, SCAN_INTERVAL_MS);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, faceapi, overlayRef, videoRef]);

  return hint;
}
