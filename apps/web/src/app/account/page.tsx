import LogoutRounded from "@mui/icons-material/LogoutRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AvatarForm, EmailNotificationsSwitch, NameForm, PasswordForm } from "@/components/account-forms";
import { FaceDataCard } from "@/components/face-data-card";
import { PageHeader, SectionTitle } from "@check-attendance/ui/page-header";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { api } from "@/lib/api";
import { getFeatures } from "@/lib/features";
import { requireAccount } from "@/lib/session";
import { getApiVersion, versionLabel } from "@/lib/versions";
import type { FaceStatus, Preferences } from "@check-attendance/shared/api";
import { formatDate } from "@check-attendance/shared/format";
import { logoutAction } from "@/modules/auth/auth.actions";
import { deleteMyFaceAction } from "@/modules/users/account.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản · Điểm danh" };

export default async function AccountPage() {
  const [user, prefs, features, face, apiVersion] = await Promise.all([
    requireAccount(),
    api<Preferences>("/v1/me/preferences"),
    getFeatures(),
    // API cũ chưa có /me/face (web và API deploy riêng): ẩn thẻ khuôn mặt thay vì hỏng cả trang
    api<FaceStatus>("/v1/me/face").catch(() => null),
    getApiVersion(),
  ]);

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

        {/* Chỉ hiện khi máy chủ đã bật gửi email */}
        {features.email && (
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Thông báo</SectionTitle>
              <EmailNotificationsSwitch initial={prefs.notifications.email} />
            </CardContent>
          </Card>
        )}

        {face && (
          <FaceDataCard
            status={
              face.hasFace
                ? `Đã lưu${face.updatedAt ? ` từ ${formatDate(face.updatedAt)}` : ""}. Chủ các nhóm bạn tham gia dùng để điểm danh bằng camera. Chỉ lưu dữ liệu đặc trưng, không lưu ảnh.`
                : "Chưa có. Lần đầu chủ nhóm điểm danh bạn bằng camera, khuôn mặt sẽ được lưu vào tài khoản."
            }
            canDelete={face.hasFace}
            action={deleteMyFaceAction}
            fields={{}}
            confirmMessage="Xóa dữ liệu khuôn mặt của bạn? Các nhóm sẽ không tự nhận ra bạn khi điểm danh bằng camera nữa (cho tới khi được lưu lại)."
          />
        )}

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

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          {versionLabel(apiVersion)}
        </Typography>
      </Stack>
    </Box>
  );
}
