// Ảnh nhỏ khuôn mặt vừa quét; chưa có ảnh thì hiện biểu tượng
import FaceRetouchingNaturalRounded from "@mui/icons-material/FaceRetouchingNaturalRounded";
import Box from "@mui/material/Box";
import { brand } from "@check-attendance/ui/brand";
import type { Snapshot } from "./types";

export function FaceThumb({ src }: { src: Snapshot }) {
  if (!src) return <FaceRetouchingNaturalRounded sx={{ fontSize: 56, color: brand.tealDark }} />;
  return (
    // Ảnh data URL tạo ngay trên máy, không cần next/image
    // eslint-disable-next-line @next/next/no-img-element
    <Box component="img" src={src} alt="" sx={{ width: { xs: 56, sm: 72 }, height: { xs: 56, sm: 72 }, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
  );
}
