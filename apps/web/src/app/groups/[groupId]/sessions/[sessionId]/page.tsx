import LockOutlined from "@mui/icons-material/LockOutlined";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AttendanceSheet, type SheetRow } from "@/components/attendance-sheet";
import { SessionHeaderMenu } from "@/components/group-menus";
import { LinkButton } from "@/components/links";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { dateInputValue, formatDate, formatTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { closeSelfCheckInAction, openSelfCheckInAction } from "@/modules/attendance/attendance.actions";
import { getAttendanceSession, getSessionRecords } from "@/modules/attendance/attendance.service";
import { DEFAULT_STATUS } from "@/modules/attendance/attendance.statuses";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { listMembers } from "@/modules/members/member.service";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function AttendanceSessionPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const user = await requireUser();

  const group = await getOwnedGroup(groupId, user.userId);
  const session = group ? await getAttendanceSession(sessionId) : null;
  if (!group || !session || session.groupId !== group.id) notFound();

  const [members, records] = await Promise.all([listMembers(group.id), getSessionRecords(session.id)]);
  const isNew = records.size === 0;

  const rows: SheetRow[] = members.map((m) => {
    const r = records.get(m.id);
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      status: r?.status ?? DEFAULT_STATUS,
      note: r?.note ?? "",
      origStatus: r?.status ?? "",
      origNote: r?.note ?? "",
      selfCheckInTime: r?.source === "self" && r.checkedInAt ? formatTime(r.checkedInAt) : null,
    };
  });
  // Dữ liệu đã lưu thay đổi (sau khi Lưu hoặc có người tự điểm danh) thì dựng lại bảng theo dữ liệu mới
  const sheetKey = rows.map((r) => `${r.id}:${r.origStatus}:${r.origNote}`).join("|");

  return (
    <>
      <PageHeader
        title={session.title}
        subtitle={`${formatDate(session.date)} · ${members.length} thành viên`}
        back={{ href: `/groups/${group.id}`, label: group.name }}
        actions={
          <SessionHeaderMenu
            sessionId={session.id}
            title={session.title}
            date={dateInputValue(session.date)}
          />
        }
      />

      <Stack spacing={2}>
        {members.length > 0 && (
          <Card sx={session.selfCheckInOpen ? { borderColor: brand.teal, bgcolor: brand.tealLighter } : undefined}>
            <CardContent sx={{ p: 2.5, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", minWidth: 0 }}>
                <QrCode2Rounded sx={{ color: brand.tealDark, mt: 0.25 }} />
                <Box>
                  <Typography variant="h2">Tự điểm danh bằng QR</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {session.selfCheckInOpen
                      ? "Đang mở. Mọi người quét mã và chọn tên mình."
                      : "Mọi người tự quét mã QR và chọn tên mình để điểm danh."}
                  </Typography>
                </Box>
              </Box>
              {session.selfCheckInOpen ? (
                <Stack direction="row" spacing={1}>
                  <LinkButton href={`/groups/${group.id}/sessions/${session.id}/qr`} variant="contained" startIcon={<QrCode2Rounded />}>
                    Hiện mã QR
                  </LinkButton>
                  <form action={closeSelfCheckInAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <SubmitButton variant="danger" pendingText="Đang đóng..." startIcon={<LockOutlined />} successMessage="Đã đóng tự điểm danh">
                      Đóng
                    </SubmitButton>
                  </form>
                </Stack>
              ) : (
                <form action={openSelfCheckInAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <SubmitButton pendingText="Đang mở..." startIcon={<QrCode2Rounded />}>
                    Mở tự điểm danh
                  </SubmitButton>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {members.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary">Nhóm chưa có thành viên.</Typography>
            </CardContent>
          </Card>
        ) : (
          <AttendanceSheet key={sheetKey} sessionId={session.id} rows={rows} isNew={isNew} />
        )}
      </Stack>
    </>
  );
}
