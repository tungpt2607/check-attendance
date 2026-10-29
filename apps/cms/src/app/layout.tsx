import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { brand } from "@check-attendance/ui/brand";
import { NavProgress } from "@check-attendance/ui/nav-progress";
import { Providers } from "@check-attendance/ui/providers";
import { Toaster } from "@check-attendance/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản trị · Điểm danh",
  description: "Trang quản trị hệ thống Điểm danh",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" style={{ backgroundColor: brand.background }}>
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <Suspense fallback={null}>
              <NavProgress />
            </Suspense>
            {children}
            <Toaster />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
