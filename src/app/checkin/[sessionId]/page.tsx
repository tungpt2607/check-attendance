import { cookies } from "next/headers";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { CheckInDone, CheckInList } from "@/components/checkin-list";
import { deviceCookieName, verifyCheckInToken } from "@/lib/checkin-token";
import { formatDate } from "@/lib/format";
import { getAttendanceSession, getCheckInSecret, getSessionRecords } from "@/modules/attendance/attendance.service";
import { getGroupName } from "@/modules/groups/group.service";
import { getMember, listMembers } from "@/modules/members/member.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tự điểm danh" };

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ t?: string }>;
};

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card sx={{ maxWidth: 400, mx: "auto", mt: 4, textAlign: "center" }}>
      <CardContent sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{title}</Typography>
        {children && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {children}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default async function CheckInPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const { t } = await searchParams;

  const session = await getAttendanceSession(sessionId);
  if (!session) return <Notice title="Không tìm thấy buổi điểm danh" />;

  const secret = await getCheckInSecret(sessionId);
  if (!secret) return <Notice title="Điểm danh đã đóng">Buổi này không còn nhận tự điểm danh.</Notice>;
  if (!verifyCheckInToken(sessionId, secret, t)) {
    return <Notice title="Mã QR đã hết hạn">Hãy quét lại mã đang hiện trên màn hình.</Notice>;
  }

  const groupName = (await getGroupName(session.groupId)) ?? "";
  const header = (
    <Box sx={{ mb: 2, textAlign: "center" }}>
      <Typography variant="body2" color="text.secondary">
        {groupName}
      </Typography>
      <Typography variant="h1" sx={{ fontSize: "1.35rem" }}>
        {session.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatDate(session.date)}
      </Typography>
    </Box>
  );

  // Điện thoại này đã điểm danh trong buổi
  const store = await cookies();
  const doneId = store.get(deviceCookieName(sessionId))?.value;
  if (doneId) {
    const m = await getMember(doneId);
    return (
      <Box sx={{ maxWidth: 440, mx: "auto" }}>
        {header}
        <CheckInDone title="Bạn đã điểm danh" name={m?.name} />
      </Box>
    );
  }

  const [members, records] = await Promise.all([listMembers(session.groupId), getSessionRecords(sessionId)]);
  const list = members.map((m) => {
    const st = records.get(m.id)?.status;
    return { id: m.id, name: m.name, code: m.code, checkedIn: st === "present" || st === "late" };
  });

  return (
    <Box sx={{ maxWidth: 440, mx: "auto" }}>
      {header}
      <CheckInList sessionId={sessionId} token={t ?? ""} members={list} />
    </Box>
  );
}
