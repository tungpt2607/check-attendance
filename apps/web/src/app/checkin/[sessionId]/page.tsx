import { cookies } from "next/headers";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { CheckInDone, CheckInList, SelfCheckInButton } from "@/components/checkin-list";
import { AppLink } from "@/components/links";
import { getSession } from "@/lib/session";
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

  const [members, records, user] = await Promise.all([
    listMembers(session.groupId),
    getSessionRecords(sessionId),
    getSession(),
  ]);
  const isPresent = (memberId: string) => {
    const st = records.get(memberId)?.status;
    return st === "present" || st === "late";
  };

  // Đã đăng nhập và đã liên kết trong nhóm: chỉ một nút điểm danh cho chính mình
  const mine = user ? members.find((m) => m.linkedUserId === user.userId) : undefined;
  if (mine) {
    return (
      <Box sx={{ maxWidth: 440, mx: "auto" }}>
        {header}
        {isPresent(mine.id) ? (
          <CheckInDone title="Bạn đã điểm danh" name={mine.name} />
        ) : (
          <SelfCheckInButton sessionId={sessionId} token={t ?? ""} memberId={mine.id} name={mine.name} />
        )}
      </Box>
    );
  }

  const list = members.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    checkedIn: isPresent(m.id),
    locked: !!m.linkedUserId,
  }));
  const hasLocked = list.some((m) => m.locked && !m.checkedIn);
  const loginHref = `/login?next=${encodeURIComponent(`/checkin/${sessionId}?t=${t ?? ""}`)}`;

  return (
    <Box sx={{ maxWidth: 440, mx: "auto" }}>
      {header}
      {hasLocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {user ? (
            <>
              Tài khoản <b>{user.email}</b> chưa liên kết với tên nào trong nhóm này. Tên có biểu tượng khóa cần đăng nhập đúng
              tài khoản đã liên kết.
            </>
          ) : (
            <>
              Tên của bạn có biểu tượng khóa?{" "}
              <AppLink href={loginHref} fontWeight={700}>
                Đăng nhập
              </AppLink>{" "}
              để điểm danh.
            </>
          )}
        </Alert>
      )}
      <CheckInList sessionId={sessionId} token={t ?? ""} members={list} />
    </Box>
  );
}
