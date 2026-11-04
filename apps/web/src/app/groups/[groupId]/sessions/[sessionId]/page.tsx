import FaceRetouchingNaturalRounded from "@mui/icons-material/FaceRetouchingNaturalRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AttendanceSheet, type SheetRow } from "@/components/attendance-sheet";
import { SessionHeaderMenu } from "@/components/session-header-menu";
import { LinkButton } from "@check-attendance/ui/links";
import { QuickAction, QuickActions } from "@check-attendance/ui/quick-actions";
import { PageHeader } from "@check-attendance/ui/page-header";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { dateInputValue, formatDate, formatTime } from "@check-attendance/shared/format";
import { requireUser } from "@/lib/session";
import { apiOrNull } from "@/lib/api";
import type { SessionDetail } from "@check-attendance/shared/api";
import { closeSelfCheckInAction, openSelfCheckInAction } from "@/modules/attendance/attendance.actions";
import { DEFAULT_STATUS } from "@/modules/attendance/attendance.statuses";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function AttendanceSessionPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  await requireUser();
  // Buổi điểm danh kèm thành viên và kết quả từng người: lấy qua API
  const session = await apiOrNull<SessionDetail>(`/v1/sessions/${encodeURIComponent(sessionId)}`);
  if (!session || session.groupId !== groupId) notFound();
  const group = { id: session.groupId, name: session.groupName };
  const members = session.rows;
  const isNew = members.every((r) => r.status === null);

  const rows: SheetRow[] = members.map((r) => ({
    id: r.memberId,
    name: r.name,
    code: r.code,
    status: r.status ?? DEFAULT_STATUS,
    note: r.note,
    origStatus: r.status ?? "",
    origNote: r.note,
    checkIn: (r.source === "self" || r.source === "face") && r.checkedInAt ? { source: r.source, time: formatTime(r.checkedInAt) } : null,
  }));
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
        {/* Các cách điểm danh: gọn trong một hàng để bảng điểm danh hiện ngay phía trên màn hình */}
        {members.length > 0 && (
          <QuickActions
            label="Cách điểm danh"
            highlighted={session.selfCheckInOpen}
            status={session.selfCheckInOpen ? "Đang mở tự điểm danh QR" : undefined}
            statusAction={
              session.selfCheckInOpen && (
                <form action={closeSelfCheckInAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <SubmitButton variant="danger" size="small" pendingText="Đang đóng..." startIcon={<LockOutlined />} successMessage="Đã đóng tự điểm danh">
                    Đóng
                  </SubmitButton>
                </form>
              )
            }
          >
            {session.selfCheckInOpen ? (
              <QuickAction hint="Trình chiếu mã QR để mọi người quét và chọn tên mình">
                <LinkButton href={`/groups/${group.id}/sessions/${session.id}/qr`} variant="contained" startIcon={<QrCode2Rounded />}>
                  Hiện mã QR
                </LinkButton>
              </QuickAction>
            ) : (
              <QuickAction hint="Mở tự điểm danh: mọi người tự quét mã QR và chọn tên mình">
                <form action={openSelfCheckInAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <SubmitButton pendingText="Đang mở..." startIcon={<QrCode2Rounded />}>
                    Mở QR
                  </SubmitButton>
                </form>
              </QuickAction>
            )}
            <QuickAction hint="Mở camera, đưa vào khuôn mặt từng người. Người chưa nhận ra thì chọn tên một lần, lần sau tự nhận ra">
              <LinkButton
                href={`/groups/${group.id}/sessions/${session.id}/face`}
                variant={session.selfCheckInOpen ? "outlined" : "contained"}
                startIcon={<FaceRetouchingNaturalRounded />}
              >
                Khuôn mặt
              </LinkButton>
            </QuickAction>
          </QuickActions>
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
