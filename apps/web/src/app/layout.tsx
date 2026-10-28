import Box from "@mui/material/Box";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { NavProgress } from "@/components/nav-progress";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/toaster";
import { brand } from "@/theme/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: "Điểm danh",
  description: "Phần mềm điểm danh theo nhóm",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Nền đặt ở <html> để phần trống dưới trang cùng màu; không ép chiều cao tối thiểu
    // nên trang ngắn hơn màn hình sẽ không cuộn được (100vh trên iPhone lớn hơn phần nhìn thấy).
    <html lang="vi" style={{ backgroundColor: brand.background }}>
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <NavProgress />
            <AppHeader />
            <Box component="main" sx={{ maxWidth: 1000, mx: "auto", px: 2, py: 3 }}>
              {children}
            </Box>
            <Toaster />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
