import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import type { AttendanceStatus } from "@/modules/attendance/attendance.statuses";
import { brand } from "@check-attendance/ui/brand";
import { StatusCounts } from "./status-chip";

/** Ngưỡng màu đã chốt với người dùng: dưới 80% cam, dưới 50% đỏ */
export function rateColor(percent: number) {
  if (percent < 50) return brand.red;
  if (percent < 80) return brand.orangeDark;
  return brand.tealDark;
}

export function toPercent(rate: number | null) {
  return rate === null ? null : Math.round(rate * 100);
}

/** Con số % chuyên cần nhỏ, có màu theo ngưỡng; chưa có kết quả thì "—" */
export function RateBadge({ rate, title, inline = false }: { rate: number | null; title?: string; inline?: boolean }) {
  const p = toPercent(rate);
  return (
    <Typography
      component="span"
      title={title}
      sx={{
        fontWeight: 700,
        fontSize: 14,
        minWidth: inline ? undefined : 40,
        textAlign: inline ? undefined : "right",
        fontVariantNumeric: "tabular-nums",
        color: p === null ? "text.disabled" : rateColor(p),
      }}
    >
      {p === null ? "—" : `${p}%`}
    </Typography>
  );
}

/** Khối chuyên cần lớn: %, thanh tiến trình và số buổi từng trạng thái */
export function RateSummary({
  rate,
  recorded,
  counts,
  unit = "buổi",
}: {
  rate: number | null;
  recorded: number;
  counts: Partial<Record<AttendanceStatus, number>>;
  /** Đơn vị đếm: "buổi" cho một người, "lượt" cho cả nhóm */
  unit?: string;
}) {
  const p = toPercent(rate);
  if (p === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Chưa có buổi điểm danh nào có kết quả.
      </Typography>
    );
  }
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography sx={{ fontSize: 36, fontWeight: 800, color: rateColor(p), lineHeight: 1 }}>{p}%</Typography>
        <Typography variant="body2" color="text.secondary">
          có mặt trên {recorded} {unit}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={p}
        sx={{ height: 8, borderRadius: 4, my: 1.5, "& .MuiLinearProgress-bar": { bgcolor: rateColor(p) } }}
      />
      <StatusCounts counts={counts} short={false} />
    </>
  );
}
