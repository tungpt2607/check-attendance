"use client";

// Hàng nút thao tác nhanh gọn trong một thẻ (vd. các cách điểm danh: QR, khuôn mặt...).
// - Các nút chia đều chiều ngang, hết chỗ thì tự xuống dòng; chữ dài thì xuống dòng trong nút (không tràn)
// - Dòng trạng thái tùy chọn phía trên (vd. "Đang mở tự điểm danh QR")
// - Mỗi nút có chú thích: di chuột (máy tính) hoặc giữ lâu (điện thoại) để xem
// Thêm cách điểm danh mới chỉ cần thêm một <QuickAction>.
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { brand } from "./brand";

type Props = {
  /** Tên vùng cho trình đọc màn hình */
  label: string;
  /** Dòng trạng thái phía trên các nút (vd. đang mở QR) */
  status?: ReactNode;
  /** Nút nhỏ cuối dòng trạng thái (vd. "Đóng"), để hàng nút chính không bị chật */
  statusAction?: ReactNode;
  /** Làm nổi thẻ (vd. đang mở tự điểm danh) */
  highlighted?: boolean;
  children: ReactNode;
};

export function QuickActions({ label, status, statusAction, highlighted = false, children }: Props) {
  return (
    <Card component="section" aria-label={label} sx={highlighted ? { borderColor: brand.teal, bgcolor: brand.tealLighter } : undefined}>
      <Box sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        {status && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 0.5, minHeight: 32 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: brand.teal, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: brand.tealDarker, fontWeight: 600 }}>
              {status}
            </Typography>
            {statusAction}
          </Box>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>{children}</Box>
      </Box>
    </Card>
  );
}

/** Một ô trong QuickActions: bọc một nút (Button, LinkButton, hoặc form chứa SubmitButton) kèm chú thích */
export function QuickAction({ hint, children, grow = 1 }: { hint: string; children: ReactNode; grow?: number }) {
  return (
    <Tooltip title={hint} enterTouchDelay={500} leaveTouchDelay={3000}>
      <Box
        sx={{
          flex: `${grow} 1 96px`,
          minWidth: 0,
          display: "flex",
          // Nút bên trong (kể cả nút trong form) giãn đủ ô, chữ dài thì xuống dòng thay vì tràn ra ngoài
          "& form": { display: "flex", flex: 1, minWidth: 0 },
          "& .MuiButton-root": { flex: 1, minWidth: 0, whiteSpace: "normal", lineHeight: 1.25 },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}
