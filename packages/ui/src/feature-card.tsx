// Thẻ "icon + tiêu đề + mô tả + nút" (vd. Tự điểm danh bằng QR, Điểm danh bằng khuôn mặt, Dữ liệu khuôn mặt).
// Màn hình hẹp: nút xuống dòng dưới phần chữ.
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { brand } from "./brand";

type Props = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Nút bên phải (xuống dòng trên màn hình hẹp) */
  actions?: ReactNode;
  /** Làm nổi thẻ (vd. đang mở tự điểm danh) */
  highlighted?: boolean;
  /** Nội dung thêm bên dưới (vd. hộp thoại đi kèm) */
  children?: ReactNode;
};

export function FeatureCard({ icon, title, description, actions, highlighted = false, children }: Props) {
  return (
    <Card sx={highlighted ? { borderColor: brand.teal, bgcolor: brand.tealLighter } : undefined}>
      <CardContent sx={{ p: 2.5, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", minWidth: 0 }}>
          <Box sx={{ color: brand.tealDark, mt: 0.25, display: "flex" }}>{icon}</Box>
          <Box>
            <Typography variant="h2">{title}</Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Box>
        {actions}
      </CardContent>
      {children}
    </Card>
  );
}
