// Lớp phủ toàn màn hình (che thanh tiêu đề), vừa đúng một màn hình điện thoại:
// trang trình chiếu mã QR, trang camera điểm danh bằng khuôn mặt và màn hình tải của chúng.
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { brand } from "./brand";

type Props = {
  /** Dòng tiêu đề đậm ở đầu (vd. "Nhóm · Buổi") */
  title?: ReactNode;
  /** Dòng chữ nhỏ dưới tiêu đề */
  subtitle?: ReactNode;
  maxWidth?: number;
  children: ReactNode;
  /** Đang tải: báo cho trình đọc màn hình */
  busy?: boolean;
};

export function FullscreenPanel({ title, subtitle, maxWidth = 520, children, busy = false }: Props) {
  return (
    <Box
      aria-busy={busy || undefined}
      aria-label={busy ? "Đang tải" : undefined}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        bgcolor: brand.background,
        px: 2,
        pt: "max(12px, env(safe-area-inset-top))",
        pb: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <Box sx={{ mx: "auto", width: "100%", maxWidth, minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(title || subtitle) && (
          <Box sx={{ textAlign: "center", lineHeight: 1.2 }}>
            {title && (
              <Typography noWrap sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
}
