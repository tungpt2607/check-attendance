"use client";

import FaceRetouchingNaturalRounded from "@mui/icons-material/FaceRetouchingNaturalRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { memo, useCallback, useMemo, useState } from "react";
import { saveAttendanceAction } from "@/modules/attendance/attendance.actions";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/modules/attendance/attendance.statuses";
import { brand } from "@check-attendance/ui/brand";
import { NameWithCode } from "@check-attendance/ui/name-with-code";
import { SearchField } from "@check-attendance/ui/search-field";
import { nameAndCode, useSearch } from "@check-attendance/ui/use-search";
import { SubmitButton } from "@check-attendance/ui/submit-button";

export type SheetRow = {
  id: string;
  name: string;
  code: string;
  /** Trạng thái đang hiển thị (đã lưu, hoặc mặc định nếu chưa lưu) */
  status: AttendanceStatus;
  note: string;
  /** Trạng thái/ghi chú đã lưu; "" nếu chưa có — để chỉ lưu dòng thực sự thay đổi */
  origStatus: string;
  origNote: string;
  /** Giờ tự điểm danh QR / quét khuôn mặt (đã định dạng) */
  checkIn: { source: "self" | "face"; time: string } | null;
};

type Props = {
  sessionId: string;
  rows: SheetRow[];
  isNew: boolean;
  /** Không có quyền điểm danh: chỉ xem kết quả */
  readOnly?: boolean;
};

/** Bảng điểm danh: tìm kiếm không dấu, lọc theo trạng thái, chọn Có mặt/Muộn/Vắng cho từng người. */
export function AttendanceSheet({ sessionId, rows, isNew, readOnly = false }: Props) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.status])),
  );
  const search = useSearch(rows, nameAndCode);
  const [filter, setFilter] = useState<"all" | AttendanceStatus>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of Object.values(statuses)) c[s] = (c[s] ?? 0) + 1;
    return c;
  }, [statuses]);

  const isVisible = (r: SheetRow) => search.matches(r) && (filter === "all" || statuses[r.id] === filter);
  const visibleCount = rows.filter(isVisible).length;
  // Ổn định qua các lần render để dòng không đổi thì không vẽ lại (AttendanceRow dùng memo)
  const setStatus = useCallback((id: string, v: AttendanceStatus) => setStatuses((s) => ({ ...s, [id]: v })), []);

  return (
    <Card sx={{ overflow: "visible" }}>
      <form action={saveAttendanceAction}>
      <input type="hidden" name="sessionId" value={sessionId} />

      {isNew && !readOnly && (
        <Alert severity="info" icon={false} sx={{ borderRadius: 0, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
          Mặc định tất cả <b>Vắng</b>. Chọn <b>Có mặt</b> hoặc <b>Muộn</b> cho những người đã đến rồi bấm Lưu.
        </Alert>
      )}

      {/* Thanh tìm kiếm + lọc, dính ngay dưới thanh tiêu đề khi cuộn */}
      <Box
        sx={{
          position: "sticky",
          top: 59,
          zIndex: 5,
          bgcolor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${brand.border}`,
          px: 2,
          py: 1.5,
        }}
      >
        <SearchField value={search.query} onChange={search.setQuery} insideForm placeholder="Tìm theo tên hoặc mã..." />
        <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap", rowGap: 1, alignItems: "center" }}>
          <Chip
            label={`Tất cả ${rows.length}`}
            onClick={() => setFilter("all")}
            color={filter === "all" ? "primary" : "default"}
            variant={filter === "all" ? "filled" : "outlined"}
          />
          {ATTENDANCE_STATUSES.map((st) => (
            <Chip
              key={st.value}
              label={`${st.label} ${counts[st.value] ?? 0}`}
              onClick={() => setFilter(st.value)}
              color={filter === st.value ? "primary" : "default"}
              variant={filter === st.value ? "filled" : "outlined"}
            />
          ))}
          {(search.active || filter !== "all") && (
            <Typography variant="caption" color="text.secondary">
              Đang hiện {visibleCount}/{rows.length}
            </Typography>
          )}
        </Stack>
      </Box>

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {rows.map((r, i) => (
          <AttendanceRow key={r.id} row={r} index={i} value={statuses[r.id]} visible={isVisible(r)} onChange={setStatus} readOnly={readOnly} />
        ))}
      </Box>

      {/* Nút lưu luôn hiện ở đáy màn hình (không có quyền điểm danh thì chỉ xem, không có nút) */}
      {!readOnly && (
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            display: "flex",
            justifyContent: "flex-end",
            px: 2,
            py: 1.5,
            bgcolor: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(8px)",
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
          }}
        >
          <SubmitButton pendingText="Đang lưu..." startIcon={<SaveRounded />} successMessage="Đã lưu điểm danh">
            Lưu điểm danh
          </SubmitButton>
        </Box>
      )}
      </form>
    </Card>
  );
}

type RowProps = {
  row: SheetRow;
  index: number;
  value: AttendanceStatus;
  visible: boolean;
  onChange: (id: string, value: AttendanceStatus) => void;
  readOnly: boolean;
};

/**
 * Một dòng của bảng. memo: chọn trạng thái cho một người chỉ vẽ lại dòng của người đó (nhóm đông vẫn mượt).
 * Dòng bị lọc chỉ ẩn đi, vẫn nằm trong form nên khi Lưu không mất dữ liệu.
 */
const AttendanceRow = memo(function AttendanceRow({ row: r, index, value, visible, onChange, readOnly }: RowProps) {
  return (
    <Box
      component="li"
      sx={{
        display: visible ? "flex" : "none",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { sm: "center" },
        justifyContent: "space-between",
        gap: 1.25,
        px: 2,
        py: 1.5,
        borderBottom: `1px solid ${brand.border}`,
      }}
    >
      <input type="hidden" name={`status_${r.id}`} value={value} />
      <input type="hidden" name={`orig_status_${r.id}`} value={r.origStatus} />
      <input type="hidden" name={`orig_note_${r.id}`} value={r.origNote} />
      <Box sx={{ minWidth: 0 }}>
        <Typography component="span" variant="caption" color="text.disabled" sx={{ mr: 1 }}>
          {index + 1}.
        </Typography>
        <Typography component="span" sx={{ fontWeight: 600 }}>
          <NameWithCode name={r.name} code={r.code} />
        </Typography>
        {r.checkIn && (
          <Chip
            size="small"
            icon={r.checkIn.source === "face" ? <FaceRetouchingNaturalRounded /> : <QrCode2Rounded />}
            label={`${r.checkIn.source === "face" ? "Khuôn mặt" : "Tự điểm danh"} ${r.checkIn.time}`}
            sx={{ ml: 1, height: 22, bgcolor: brand.tealLighter, color: brand.tealDarker, "& .MuiChip-icon": { color: brand.tealDark, fontSize: 16 } }}
          />
        )}
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          disabled={readOnly}
          value={value}
          onChange={(_e, v: AttendanceStatus | null) => v && onChange(r.id, v)}
          aria-label={`Trạng thái của ${r.name}`}
        >
          {ATTENDANCE_STATUSES.map((st) => (
            <ToggleButton
              key={st.value}
              value={st.value}
              sx={{ px: 1.5, "&.Mui-selected, &.Mui-selected:hover": { bgcolor: st.bg, color: st.fg, fontWeight: 700 } }}
            >
              {st.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          name={`note_${r.id}`}
          defaultValue={r.note}
          placeholder="Ghi chú"
          disabled={readOnly}
          sx={{ width: { xs: "100%", sm: 150 } }}
        />
      </Stack>
    </Box>
  );
});
