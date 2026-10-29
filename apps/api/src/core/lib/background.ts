// Chạy việc phụ (gửi email...) sau khi đã trả kết quả cho người dùng.
// Trên Vercel dùng waitUntil để hàm không bị dừng trước khi việc phụ xong.
import { waitUntil } from "@vercel/functions";

export function runInBackground(label: string, task: () => Promise<unknown>): void {
  const p = task().catch((err) => console.error(`[background] ${label} failed`, err));
  try {
    waitUntil(p);
  } catch {
    // Không chạy trên Vercel (máy cá nhân): việc phụ vẫn chạy bình thường
  }
}
