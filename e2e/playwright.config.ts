// Kiểm thử đầu-cuối: Playwright tự bật API (Node, MongoDB thật) và web (bản build) rồi chạy các kịch bản trong tests/.
// Cần: MONGODB_TEST_URI, web đã build với NEXT_PUBLIC_API_URL=http://localhost:8787 (CI làm sẵn), ffmpeg (tạo video camera giả).
import { defineConfig } from "@playwright/test";

const API_PORT = 8787;
const WEB_PORT = 3100;
export const AUTH_SECRET = process.env.AUTH_SECRET || "e2e-secret-khong-dung-that";
const mongo = new URL(process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/");
mongo.pathname = `/ca_e2e_${Date.now()}`;

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  // Model khuôn mặt chạy bằng CPU trong CI: chậm, nên cho mỗi kịch bản nhiều thời gian
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx tsx ../apps/api/scripts/serve.ts",
      port: API_PORT,
      env: {
        PORT: String(API_PORT),
        MONGODB_URI: mongo.toString(),
        AUTH_SECRET,
        WEB_URL: `http://localhost:${WEB_PORT}`,
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run start -w @check-attendance/web -- -p ${WEB_PORT}`,
      cwd: "..",
      port: WEB_PORT,
      env: { AUTH_SECRET },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
