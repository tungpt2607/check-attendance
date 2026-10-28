import FormatListBulletedRounded from "@mui/icons-material/FormatListBulletedRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { notFound, redirect } from "next/navigation";
import { LinkButton } from "@/components/links";
import { QrPresenter } from "@/components/qr-presenter";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { closeSelfCheckInAction } from "@/modules/attendance/attendance.actions";
import { getAttendanceSession } from "@/modules/attendance/attendance.service";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string; sessionId: string }> };

export default async function QrPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const user = await requireUser();
  const group = await getOwnedGroup(groupId, user.userId);
  const session = group ? await getAttendanceSession(sessionId) : null;
  if (!group || !session || session.groupId !== group.id) notFound();
  if (!session.selfCheckInOpen) redirect(`/groups/${group.id}/sessions/${session.id}`);

  const back = `/groups/${group.id}/sessions/${session.id}`;

  return (
    // Lớp phủ toàn màn hình: che thanh tiêu đề, mọi thứ vừa trong một màn hình điện thoại
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        bgcolor: brand.background,
        px: 2,
        pt: "max(12px, env(safe-area-inset-top))",
        pb: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <Box sx={{ mx: "auto", width: "100%", maxWidth: 520, minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ textAlign: "center", lineHeight: 1.2 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {group.name} · {session.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(session.date)} · Quét mã và chọn tên mình để điểm danh
          </Typography>
        </Box>

        <QrPresenter sessionId={session.id} />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <LinkButton href={back} variant="outlined" color="inherit" startIcon={<FormatListBulletedRounded />}>
            Xem danh sách
          </LinkButton>
          <form action={closeSelfCheckInAction} style={{ display: "flex", minWidth: 0 }}>
            <input type="hidden" name="sessionId" value={session.id} />
            <SubmitButton
              variant="danger"
              fullWidth
              pendingText="Đang đóng..."
              startIcon={<LockOutlined />}
              successMessage="Đã đóng tự điểm danh"
              confirmLabel="Đóng"
              confirm="Đóng tự điểm danh? Sau khi đóng, quét mã sẽ không điểm danh được nữa."
            >
              Đóng QR
            </SubmitButton>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
