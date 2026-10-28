import LogoutRounded from "@mui/icons-material/LogoutRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { AvatarForm, NameForm, PasswordForm } from "@/components/account-forms";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/modules/auth/auth.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản · Điểm danh" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <Box sx={{ maxWidth: 520, mx: "auto" }}>
      <PageHeader title="Tài khoản của tôi" subtitle={user.email} back={{ href: "/groups", label: "Nhóm của tôi" }} />

      <Stack spacing={2}>
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Ảnh đại diện</SectionTitle>
            <AvatarForm userId={user.userId} name={user.name} version={user.avatarVersion} />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Họ tên</SectionTitle>
            <NameForm name={user.name} />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Đổi mật khẩu</SectionTitle>
            <PasswordForm />
          </CardContent>
        </Card>

        <form action={logoutAction}>
          <SubmitButton variant="ghost" fullWidth size="large" pendingText="Đang đăng xuất..." startIcon={<LogoutRounded />}>
            Đăng xuất
          </SubmitButton>
        </form>
      </Stack>
    </Box>
  );
}
