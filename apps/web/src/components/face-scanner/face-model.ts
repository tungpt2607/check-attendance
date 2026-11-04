// Tải bộ nhận diện khuôn mặt (face-api) một lần cho cả trang; chạy hoàn toàn trên trình duyệt.
import type * as FaceApi from "@vladmandic/face-api";

export type FaceApiModule = typeof FaceApi;
export type FaceBox = FaceApi.Box;

/** Thư mục model trong public/ (tiny_face_detector, face_landmark_68, face_recognition). Đổi model: đổi thư mục (xem README) */
export const MODEL_URL = "/models/face";

let loading: Promise<FaceApiModule> | null = null;

/**
 * Chọn nơi chạy model: WebGL (GPU của điện thoại, nhanh) nếu có, không thì CPU (chậm hơn nhưng chạy được).
 * Không để thư viện tự chọn: nó ưu tiên WebAssembly, cần thêm file .wasm mà web không phục vụ.
 */
async function chooseBackend(faceapi: FaceApiModule) {
  // Kiểu dữ liệu của thư viện không khai báo hai hàm này dù bản chạy có (TensorFlow.js)
  const tf = faceapi.tf as unknown as { setBackend(name: string): Promise<boolean>; ready(): Promise<void> };
  for (const name of ["webgl", "cpu"]) {
    try {
      if (await tf.setBackend(name)) {
        await tf.ready();
        return;
      }
    } catch {
      // thử cách tiếp theo
    }
  }
  throw new Error("Không có backend nào chạy được");
}

/** Nạp thư viện + model (chỉ lần đầu; mở lại trang camera dùng luôn bản đã nạp). Lỗi thì lần sau thử lại. */
export function loadFaceApi(): Promise<FaceApiModule> {
  loading ??= (async () => {
    const faceapi = await import("@vladmandic/face-api");
    await chooseBackend(faceapi);
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  })().catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

/** Khoảng cách Euclid giữa hai vector khuôn mặt (càng nhỏ càng giống) */
export function faceDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Ảnh nhỏ khuôn mặt vừa quét, chỉ để chủ nhóm đối chiếu trên màn hình (không gửi đi) */
export function captureFace(video: HTMLVideoElement, box: FaceBox): string {
  const pad = box.width * 0.3;
  const sx = Math.max(0, box.x - pad);
  const sy = Math.max(0, box.y - pad);
  const sw = Math.min(video.videoWidth - sx, box.width + pad * 2);
  const sh = Math.min(video.videoHeight - sy, box.height + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = Math.round((160 * sh) / sw) || 160;
  canvas.getContext("2d")?.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}
