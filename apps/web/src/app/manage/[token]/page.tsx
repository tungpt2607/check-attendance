import ManageAccountsRounded from "@mui/icons-material/ManageAccountsRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { ManagerInviteInfo } from "@check-attendance/shared/api";
import { LinkButton } from "@check-attendance/ui/links";
import { Logo } from "@check-attendance/ui/logo";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { PermissionChips } from "@/components/managers/permission-picker";
import { api, ApiError, enc } from "@/lib/api";
import { requireAccount } from "@/lib/session";
import { acceptManagerInviteAction } from "@/modules/groups/manager.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lời mời quản lý nhóm · Điểm danh" };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

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

/** Người được mời mở link: xem nhóm, quyền được cấp, bấm nhận lời */
export default async function ManagerInvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  const user = await requireAccount();

  let info: ManagerInviteInfo;
  try {
    info = await api<ManagerInviteInfo>(`/v1/manager-invites/${enc(token)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      return (
        <Shell>
          <Alert severity="warning" sx={{ textAlign: "left", mb: 2 }}>
            {err.message}
          </Alert>
          <LinkButton href="/groups" variant="outlined" color="inherit">
            Về trang chính
          </LinkButton>
        </Shell>
      );
    }
    throw err;
  }

  return (
    <Shell>
      {error && (
        <Alert severity="error" sx={{ textAlign: "left", mb: 2 }}>
          {error}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        {info.invitedBy || "Chủ nhóm"} mời bạn làm người quản lý nhóm
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 20, mt: 0.5 }}>{info.groupName}</Typography>
      <Stack spacing={1} sx={{ mt: 2.5, alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Bạn sẽ được làm:
        </Typography>
        <PermissionChips permissions={info.permissions} />
        <Typography variant="caption" color="text.secondary">
          Áp dụng cho nhóm này và mọi nhóm con bên trong. Tài khoản: <b>{user.email}</b>
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <LinkButton href="/groups" variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Để sau
        </LinkButton>
        <form action={acceptManagerInviteAction} style={{ flex: 1, display: "flex" }}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton fullWidth pendingText="Đang nhận..." startIcon={<ManageAccountsRounded />}>
            Nhận lời
          </SubmitButton>
        </form>
      </Stack>
    </Shell>
  );
}
