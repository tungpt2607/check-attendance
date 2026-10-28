import HowToRegRounded from "@mui/icons-material/HowToRegRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/links";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/session";
import { api, ApiError } from "@/lib/api";
import type { InviteInfo } from "@/lib/api-types";
import { acceptInviteAction } from "@/modules/invites/invite.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lời mời · Điểm danh" };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

const REASONS: Record<string, string> = {
  not_found: "Link mời không tồn tại.",
  revoked: "Link mời này đã bị thay bằng link mới. Hãy xin người quản lý gửi lại.",
  used: "Link mời này đã được dùng.",
  expired: "Link mời đã hết hạn. Hãy xin người quản lý gửi lại.",
  member_taken: "Tên này đã được liên kết với một tài khoản khác.",
  user_in_group: "Tài khoản của bạn đã liên kết với một tên khác trong nhóm này.",
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 2 }}>
      <Card>
        <CardContent sx={{ p: 3, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Logo size={48} />
          </Box>
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <Shell>
      <Alert severity="warning" sx={{ textAlign: "left", mb: 2 }}>
        {message}
      </Alert>
      <LinkButton href="/groups" variant="outlined" color="inherit">
        Về trang chính
      </LinkButton>
    </Shell>
  );
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  const user = await requireUser();

  let info: InviteInfo;
  try {
    info = await api<InviteInfo>(`/v1/invites/${encodeURIComponent(token)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      return <Problem message={REASONS[err.code.replace(/^invite_/, "")] ?? REASONS.not_found} />;
    }
    throw err;
  }
  const member = { id: info.memberId, name: info.memberName, code: info.memberCode };
  if (info.myMemberId === member.id) {
    return (
      <Shell>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Bạn đã liên kết với tên này</Typography>
        <LinkButton href={`/me/${member.id}`} variant="contained" sx={{ mt: 2 }}>
          Xem lịch sử điểm danh
        </LinkButton>
      </Shell>
    );
  }
  if (info.memberAlreadyLinked) return <Problem message={REASONS.member_taken} />;
  if (info.myMemberId) return <Problem message={`${REASONS.user_in_group} (Tên đang liên kết: ${info.myMemberName ?? ""})`} />;

  const groupName = info.groupName;

  return (
    <Shell>
      {error && REASONS[error] && (
        <Alert severity="error" sx={{ textAlign: "left", mb: 2 }}>
          {REASONS[error]}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        Lời mời từ nhóm
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{groupName}</Typography>
      <Typography sx={{ mt: 2.5, fontSize: 17 }}>
        Bạn là <b>{member.name}</b>
        {member.code ? ` (${member.code})` : ""}?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Sau khi liên kết, bạn xem được lịch sử điểm danh của mình và tự điểm danh bằng QR khi đã đăng nhập tài khoản{" "}
        <b>{user.email}</b>.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <LinkButton href="/groups" variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Không phải tôi
        </LinkButton>
        <form action={acceptInviteAction} style={{ flex: 1, display: "flex" }}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton fullWidth pendingText="Đang liên kết..." startIcon={<HowToRegRounded />}>
            Đúng, liên kết
          </SubmitButton>
        </form>
      </Stack>
    </Shell>
  );
}
