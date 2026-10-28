import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/modules/attendance/attendance.statuses";

const BY_VALUE = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s.value, s]));

/** Nhãn trạng thái điểm danh kèm số lượng, màu theo logo */
export function StatusChip({
  status,
  count,
  short = false,
  hideCount = false,
}: {
  status: AttendanceStatus;
  count: number;
  short?: boolean;
  /** Chỉ hiện tên trạng thái, không kèm số */
  hideCount?: boolean;
}) {
  const st = BY_VALUE[status];
  const text = short ? st.short : st.label;
  return (
    <Chip
      size="small"
      label={hideCount ? text : `${text} ${count}`}
      sx={{ bgcolor: st.bg, color: st.fg, fontWeight: 600, borderRadius: 1.5 }}
    />
  );
}

/** Hàng nhãn Có / Muộn / Vắng */
export function StatusCounts({ counts, short = true }: { counts: Partial<Record<AttendanceStatus, number>>; short?: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
      {ATTENDANCE_STATUSES.map((st) => (
        <StatusChip key={st.value} status={st.value} count={counts[st.value] ?? 0} short={short} />
      ))}
    </Stack>
  );
}
