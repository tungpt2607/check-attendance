import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { FaceScanner } from "@/components/face-scanner";
import { formatDate } from "@check-attendance/shared/format";
import { isAttended } from "@check-attendance/shared/statuses";
import { requireUser } from "@/lib/session";
import { apiOrNull } from "@/lib/api";
import type { SessionDetail } from "@check-attendance/shared/api";
import { FullscreenPanel } from "@check-attendance/ui/fullscreen-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Điểm danh bằng khuôn mặt · Điểm danh" };

type Props = { params: Promise<{ groupId: string; sessionId: string }> };

/** Chủ nhóm mở camera, đi quét khuôn mặt từng người để điểm danh */
export default async function FaceCheckInPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  await requireUser();
  const session = await apiOrNull<SessionDetail>(`/v1/sessions/${encodeURIComponent(sessionId)}`);
  if (!session || session.groupId !== groupId) notFound();

  const back = `/groups/${session.groupId}/sessions/${session.id}`;
  const members = session.rows.map((r) => ({ id: r.memberId, name: r.name, code: r.code, attended: isAttended(r.status) }));

  return (
    // Lớp phủ toàn màn hình như trang mã QR: camera chiếm gần hết màn hình điện thoại
    <FullscreenPanel
      maxWidth={560}
      title={`${session.groupName} · ${session.title}`}
      subtitle={`${formatDate(session.date)} · Điểm danh bằng khuôn mặt`}
    >
      {members.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
          Nhóm chưa có thành viên.
        </Typography>
      ) : (
        <FaceScanner groupId={session.groupId} sessionId={session.id} members={members} backHref={back} />
      )}
    </FullscreenPanel>
  );
}
