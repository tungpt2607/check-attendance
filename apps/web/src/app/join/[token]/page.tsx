import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { JoinPicker } from "@/components/join-picker";
import { LinkButton } from "@/components/links";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/session";
import { api, ApiError } from "@/lib/api";
import type { JoinInfo } from "@/lib/api-types";
import { cancelLinkRequestAction } from "@/modules/invites/invite.actions";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tham gia nhóm · Điểm danh" };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

const ERRORS: Record<string, string> = {
  member_taken: "Tên này vừa được người khác liên kết. Hãy chọn lại hoặc báo người quản lý.",
  user_in_group: "Tài khoản của bạn đã liên kết với một tên trong nhóm này.",
  already_pending: "Bạn đã có một yêu cầu đang chờ duyệt.",
};

function Shell({ groupName, children }: { groupName?: string; children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 440, mx: "auto" }}>
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <Logo size={44} />
        </Box>
        {groupName && (
          <>
            <Typography variant="body2" color="text.secondary">
              Tham gia nhóm
            </Typography>
            <Typography variant="h1" sx={{ fontSize: "1.35rem" }}>
              {groupName}
            </Typography>
          </>
        )}
      </Box>
      {children}
    </Box>
  );
}

export default async function JoinPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  const user = await requireUser();

  let info: JoinInfo;
  try {
    info = await api<JoinInfo>(`/v1/join/${encodeURIComponent(token)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      return (
        <Shell>
          <Alert severity="warning">Link tham gia không còn hiệu lực. Hãy xin người quản lý nhóm gửi link mới.</Alert>
        </Shell>
      );
    }
    throw err;
  }
  const groupName = info.groupName;

  // Đã liên kết trong nhóm này
  const linked = info.myMemberId ? { id: info.myMemberId, name: info.myMemberName ?? "" } : null;
  if (linked) {
    return (
      <Shell groupName={groupName}>
        <Card>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Typography>
              Tài khoản của bạn đã liên kết với <b>{linked.name}</b>.
            </Typography>
            <LinkButton href={`/me/${linked.id}`} variant="contained" sx={{ mt: 2 }}>
              Xem lịch sử điểm danh
            </LinkButton>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Đang chờ duyệt
  const pending = info.pendingRequest;
  if (pending) {
    const member = { name: pending.memberName };
    return (
      <Shell groupName={groupName}>
        <Card sx={{ borderColor: brand.orange, bgcolor: brand.orangeLight }}>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <HourglassTopRounded sx={{ fontSize: 44, color: brand.orangeDark }} />
            <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 1 }}>Đang chờ duyệt</Typography>
            <Typography sx={{ mt: 0.5 }}>
              Bạn đã xin nhận tên <b>{member?.name ?? ""}</b>. Người quản lý nhóm sẽ duyệt sớm.
            </Typography>
            <form action={cancelLinkRequestAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton variant="ghost" pendingText="Đang hủy..." confirmLabel="Hủy yêu cầu" confirm="Hủy yêu cầu này để chọn lại tên?">
                Chọn nhầm tên? Hủy yêu cầu
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const members = info.members;

  return (
    <Shell groupName={groupName}>
      {error && ERRORS[error] && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {ERRORS[error]}
        </Alert>
      )}
      {members.length === 0 ? (
        <Alert severity="info">Mọi tên trong nhóm đều đã được liên kết. Nếu thiếu tên bạn, hãy báo người quản lý.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: "center" }}>
            Chọn đúng tên của bạn. Người quản lý sẽ duyệt trước khi tài khoản <b>{user.email}</b> được liên kết.
          </Typography>
          <JoinPicker token={token} members={members.map((m) => ({ id: m.id, name: m.name, code: m.code }))} />
        </>
      )}
    </Shell>
  );
}
