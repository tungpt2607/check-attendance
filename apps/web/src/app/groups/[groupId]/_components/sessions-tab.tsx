// Tab "Điểm danh" của trang nhóm: tạo buổi mới + danh sách buổi kèm số Có mặt/Muộn/Vắng
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Fragment } from "react";
import type { SessionSummary } from "@check-attendance/shared/api";
import { formatDate, todayInputValue } from "@check-attendance/shared/format";
import { ListLink } from "@/components/links";
import { SectionTitle } from "@/components/page-header";
import { StatusCounts } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import { createSessionAction } from "@/modules/attendance/attendance.actions";
import { brand } from "@/theme/brand";

type Props = { groupId: string; memberCount: number; sessions: SessionSummary[] };

export function SessionsTab({ groupId, memberCount, sessions }: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle>Điểm danh</SectionTitle>
        {memberCount === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Thêm thành viên trước khi điểm danh.
          </Typography>
        ) : (
          <form action={createSessionAction}>
            <input type="hidden" name="groupId" value={groupId} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField name="title" label="Tên buổi" placeholder="Buổi sáng, Tiết 1..." />
              <TextField
                name="date"
                label="Ngày"
                type="date"
                required
                defaultValue={todayInputValue()}
                sx={{ width: { sm: 200 }, flexShrink: 0 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <SubmitButton pendingText="Đang tạo..." startIcon={<EventAvailableRounded />} sx={{ flexShrink: 0, height: 40 }}>
                Bắt đầu điểm danh
              </SubmitButton>
            </Stack>
          </form>
        )}

        {sessions.length > 0 && (
          <List disablePadding sx={{ mt: 2, mx: -1 }}>
            {sessions.map((s, i) => (
              <Fragment key={s.id}>
                {i > 0 && <Divider component="li" />}
                <ListLink href={`/groups/${groupId}/sessions/${s.id}`} sx={{ borderRadius: 2, py: 1.25, px: 1, display: "block" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{s.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(s.date)}
                    </Typography>
                    {s.selfCheckInOpen && (
                      <Chip
                        size="small"
                        icon={<QrCode2Rounded />}
                        label="QR đang mở"
                        sx={{ bgcolor: brand.tealLighter, color: brand.tealDarker, "& .MuiChip-icon": { color: brand.tealDark } }}
                      />
                    )}
                  </Stack>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <StatusCounts counts={s.counts} />
                  </Box>
                </ListLink>
              </Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
