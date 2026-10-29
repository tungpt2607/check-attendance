/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Gói dùng chung viết bằng TypeScript (không build sẵn): để Next biên dịch cùng CMS
  transpilePackages: ["@check-attendance/shared", "@check-attendance/ui"],
};

export default nextConfig;
