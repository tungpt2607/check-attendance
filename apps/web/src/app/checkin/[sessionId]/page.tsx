import { cookies } from "next/headers";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { CheckInDone, CheckInList, SelfCheckInButton } from "@/components/checkin-list";
import { LinkButton } from "@/components/links";
import { getSession } from "@/lib/session";
import { api, ApiError } from "@/lib/api";
import type { CheckInInfo } from "@check-attendance/shared/api";
import { deviceCookieName } from "@check-attendance/shared/short-code";
import { formatDate } from "@check-attendance/shared/format";

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

  // Thông tin buổi + danh sách tên qua API (gửi kèm phiên đăng nhập nếu có, để biết tên của chính mình)
  let session: CheckInInfo;
  try {
    session = await api<CheckInInfo>(`/v1/checkin/${encodeURIComponent(sessionId)}?t=${encodeURIComponent(t ?? "")}`);
  } catch (err) {
    if (err instanceof ApiError && err.code === "expired") {
      return <Notice title="Mã QR đã hết hạn">Hãy quét lại mã đang hiện trên màn hình.</Notice>;
    }
    if (err instanceof ApiError && err.status < 500) {
      return <Notice title="Điểm danh đã đóng">Buổi này không còn nhận tự điểm danh.</Notice>;
    }
    throw err;
  }

  const groupName = session.groupName;
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
    const m = session.members.find((x) => x.id === doneId);
    return (
      <Box sx={{ maxWidth: 440, mx: "auto" }}>
        {header}
        <CheckInDone title="Bạn đã điểm danh" name={m?.name} />
      </Box>
    );
  }

  const members = session.members;
  const user = await getSession();
  const isPresent = (memberId: string) => !!members.find((m) => m.id === memberId)?.checkedIn;

  // Đã đăng nhập và đã liên kết trong nhóm: chỉ một nút điểm danh cho chính mình
  const mine = members.find((m) => m.isMe);
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
    locked: m.linked,
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
              Tên của bạn có biểu tượng khóa? Hãy đăng nhập đúng tài khoản đã liên kết để điểm danh.
              <Box sx={{ mt: 1 }}>
                <LinkButton href={loginHref} variant="contained" size="small">
                  Đăng nhập
                </LinkButton>
              </Box>
            </>
          )}
        </Alert>
      )}
      <CheckInList sessionId={sessionId} token={t ?? ""} members={list} loginHref={loginHref} loggedInEmail={user?.email ?? null} />
    </Box>
  );
}
