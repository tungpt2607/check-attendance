import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { FaceScanner } from "@/components/face-scanner";
import { formatDate } from "@check-attendance/shared/format";
import { isAttended } from "@check-attendance/shared/statuses";
import { requireUser } from "@/lib/session";
import { apiOrNull } from "@/lib/api";
import type { SessionDetail } from "@check-attendance/shared/api";
import { brand } from "@check-attendance/ui/brand";

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
      <Box sx={{ mx: "auto", width: "100%", maxWidth: 560, minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ textAlign: "center", lineHeight: 1.2 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {session.groupName} · {session.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(session.date)} · Điểm danh bằng khuôn mặt
          </Typography>
        </Box>
        {members.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            Nhóm chưa có thành viên.
          </Typography>
        ) : (
          <FaceScanner groupId={session.groupId} sessionId={session.id} members={members} backHref={back} />
        )}
      </Box>
    </Box>
  );
}
