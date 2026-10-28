import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { NavProgress } from "@/components/nav-progress";
import { Toaster } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Điểm danh",
  description: "Phần mềm điểm danh theo nhóm",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Nền đặt ở <html> để phần trống dưới trang cùng màu; <body> không ép chiều cao tối thiểu
    // nên trang ngắn hơn màn hình sẽ không cuộn được (100vh trên iPhone lớn hơn phần nhìn thấy).
    <html lang="vi" className="bg-slate-50">
      <body className="text-ink antialiased">
        <NavProgress />
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
