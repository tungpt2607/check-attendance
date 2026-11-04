// Tạo video camera giả (y4m) từ ảnh khuôn mặt mẫu: Chrome phát video này thay cho camera thật.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const TMP = fileURLToPath(new URL("./.tmp/", import.meta.url));
const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));

export default function globalSetup() {
  mkdirSync(TMP, { recursive: true });
  for (const name of ["face-a", "face-b"]) {
    const out = `${TMP}${name}.y4m`;
    if (existsSync(out)) continue;
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-loop", "1", "-i", `${FIXTURES}${name}.jpg`, "-t", "2", "-r", "10", "-pix_fmt", "yuv420p", out]);
  }
}
