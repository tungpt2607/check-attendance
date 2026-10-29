"use client";

import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Fragment, useMemo, useState } from "react";
import { normalizeSearch } from "@check-attendance/shared/search";
import { saveAttendanceAction } from "@/modules/attendance/attendance.actions";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/modules/attendance/attendance.statuses";
import { brand } from "@check-attendance/ui/brand";
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
  /** Giờ tự điểm danh (đã định dạng), nếu người này tự quét QR */
  selfCheckInTime: string | null;
};

type Props = { sessionId: string; rows: SheetRow[]; isNew: boolean };

/** Bảng điểm danh: tìm kiếm không dấu, lọc theo trạng thái, chọn Có mặt/Muộn/Vắng cho từng người. */
export function AttendanceSheet({ sessionId, rows, isNew }: Props) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.status])),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AttendanceStatus>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of Object.values(statuses)) c[s] = (c[s] ?? 0) + 1;
    return c;
  }, [statuses]);

  const q = normalizeSearch(query);
  const isVisible = (r: SheetRow) =>
    (!q || normalizeSearch(`${r.name} ${r.code}`).includes(q)) && (filter === "all" || statuses[r.id] === filter);
  const visibleCount = rows.filter(isVisible).length;

  return (
    <Card sx={{ overflow: "visible" }}>
      <form action={saveAttendanceAction}>
      <input type="hidden" name="sessionId" value={sessionId} />

      {isNew && (
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
        <TextField
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter trong ô tìm kiếm không vô tình bấm Lưu
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Tìm theo tên hoặc mã..."
          slotProps={{
            // Không gửi ô tìm kiếm cùng form khi lưu
            htmlInput: { form: "__none__" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
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
          {(q || filter !== "all") && (
            <Typography variant="caption" color="text.secondary">
              Đang hiện {visibleCount}/{rows.length}
            </Typography>
          )}
        </Stack>
      </Box>

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {rows.map((r, i) => {
          const value = statuses[r.id];
          return (
            // Dòng bị lọc chỉ ẩn đi, vẫn nằm trong form nên khi Lưu không mất dữ liệu
            <Fragment key={r.id}>
              <Box
                component="li"
                sx={{
                  display: isVisible(r) ? "flex" : "none",
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
                    {i + 1}.
                  </Typography>
                  {r.code && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      {r.code}
                    </Typography>
                  )}
                  <Typography component="span" sx={{ fontWeight: 600 }}>
                    {r.name}
                  </Typography>
                  {r.selfCheckInTime && (
                    <Chip
                      size="small"
                      icon={<QrCode2Rounded />}
                      label={`Tự điểm danh ${r.selfCheckInTime}`}
                      sx={{ ml: 1, height: 22, bgcolor: brand.tealLighter, color: brand.tealDarker, "& .MuiChip-icon": { color: brand.tealDark, fontSize: 16 } }}
                    />
                  )}
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={value}
                    onChange={(_e, v: AttendanceStatus | null) => v && setStatuses((s) => ({ ...s, [r.id]: v }))}
                    aria-label={`Trạng thái của ${r.name}`}
                  >
                    {ATTENDANCE_STATUSES.map((st) => (
                      <ToggleButton
                        key={st.value}
                        value={st.value}
                        sx={{
                          px: 1.5,
                          "&.Mui-selected, &.Mui-selected:hover": { bgcolor: st.bg, color: st.fg, fontWeight: 700 },
                        }}
                      >
                        {st.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <TextField
                    name={`note_${r.id}`}
                    defaultValue={r.note}
                    placeholder="Ghi chú"
                    sx={{ width: { xs: "100%", sm: 150 } }}
                  />
                </Stack>
              </Box>
            </Fragment>
          );
        })}
      </Box>

      {/* Nút lưu luôn hiện ở đáy màn hình */}
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
      </form>
    </Card>
  );
}
