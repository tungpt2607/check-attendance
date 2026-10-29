"use client";

// Biểu đồ cột nhỏ cho một chỉ số theo ngày (1 màu, không cần chú thích — tiêu đề gọi tên chỉ số).
// Di chuột / chạm vào cột để xem ngày và số; có bảng số liệu ẩn cho trình đọc màn hình.
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { brand } from "@check-attendance/ui/brand";

type Point = { date: string; value: number };

function dayLabel(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function MiniBars({ title, points }: { title: string; points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((s, p) => s + p.value, 0);
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          30 ngày: <b>{total.toLocaleString("vi-VN")}</b>
        </Typography>
      </Box>
      <Box
        role="img"
        aria-label={`${title}: tổng ${total} trong 30 ngày`}
        sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 72, borderBottom: `1px solid ${brand.border}` }}
      >
        {points.map((p) => (
          <Tooltip key={p.date} title={`${dayLabel(p.date)}: ${p.value}`} placement="top" arrow disableInteractive>
            {/* Vùng bấm cao hết khung để dễ chạm, cột thật nằm ở đáy */}
            <Box sx={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "default" }}>
              <Box
                sx={{
                  width: "100%",
                  height: p.value > 0 ? `${Math.max(4, (p.value / max) * 100)}%` : 0,
                  bgcolor: brand.tealDark,
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {points[0] ? dayLabel(points[0].date) : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Cao nhất: {max === 1 && total === 0 ? 0 : max}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {points.at(-1) ? dayLabel(points.at(-1)!.date) : ""}
        </Typography>
      </Box>
      <Box component="table" sx={visuallyHidden}>
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;
