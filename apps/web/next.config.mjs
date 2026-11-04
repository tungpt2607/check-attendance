import { readFileSync } from "node:fs";

// Phiên bản hiển thị trong giao diện: lấy từ package.json của dự án này (tăng thủ công trong PR, xem README "Phiên bản")
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
  eslint: { ignoreDuringBuilds: true },
  // Gói dùng chung viết bằng TypeScript (không build sẵn): để Next biên dịch cùng web
  transpilePackages: ["@check-attendance/shared", "@check-attendance/ui"],
  // Model nhận diện khuôn mặt (~7MB) không đổi: trình duyệt lưu 1 năm, không hỏi lại máy chủ mỗi lần mở camera.
  // Đổi model thì đặt vào thư mục mới (vd. /models/face-v2) để trình duyệt tải bản mới.
  async headers() {
    return [{ source: "/models/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
