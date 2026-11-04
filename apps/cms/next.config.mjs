import { readFileSync } from "node:fs";

// Phiên bản hiển thị trong giao diện: lấy từ package.json của dự án này (tăng thủ công trong PR, xem README "Phiên bản")
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
  eslint: { ignoreDuringBuilds: true },
  // Gói dùng chung viết bằng TypeScript (không build sẵn): để Next biên dịch cùng CMS
  transpilePackages: ["@check-attendance/shared", "@check-attendance/ui"],
};

export default nextConfig;
