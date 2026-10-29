/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Gói dùng chung viết bằng TypeScript (không build sẵn): để Next biên dịch cùng web
  transpilePackages: ["@check-attendance/shared"],
};

export default nextConfig;
