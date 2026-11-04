import FormatListBulletedRounded from "@mui/icons-material/FormatListBulletedRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import Box from "@mui/material/Box";
import { notFound, redirect } from "next/navigation";
import { FullscreenPanel } from "@check-attendance/ui/fullscreen-panel";
import { LinkButton } from "@check-attendance/ui/links";
import { QrPresenter } from "@/components/qr-presenter";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { formatDate } from "@check-attendance/shared/format";
import { requireUser } from "@/lib/session";
import { apiOrNull } from "@/lib/api";
import type { SessionDetail } from "@check-attendance/shared/api";
import { closeSelfCheckInAction } from "@/modules/attendance/attendance.actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string; sessionId: string }> };

export default async function QrPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  await requireUser();
  const session = await apiOrNull<SessionDetail>(`/v1/sessions/${encodeURIComponent(sessionId)}`);
  if (!session || session.groupId !== groupId) notFound();
  const group = { id: session.groupId, name: session.groupName };
  if (!session.selfCheckInOpen) redirect(`/groups/${group.id}/sessions/${session.id}`);

  const back = `/groups/${group.id}/sessions/${session.id}`;

  return (
    <FullscreenPanel
      title={`${group.name} · ${session.title}`}
      subtitle={`${formatDate(session.date)} · Quét mã và chọn tên mình để điểm danh`}
    >
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
    </FullscreenPanel>
  );
}
