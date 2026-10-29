import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import BlockRounded from "@mui/icons-material/BlockRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import PersonRemoveOutlined from "@mui/icons-material/PersonRemoveOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import type { AdminUserDetail, SystemInfo } from "@check-attendance/shared/admin";
import { formatDateTime } from "@check-attendance/shared/format";
import { ActionButton } from "@check-attendance/ui/action-button";
import { Avatar } from "@check-attendance/ui/avatar";
import { ListLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { EmptyText, Section, UserBadges } from "@/components/bits";
import { api, apiOrNull, enc } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  disableUserAction,
  enableUserAction,
  revokeSessionsAction,
  sendPasswordResetAction,
  setRoleAction,
} from "@/modules/admin.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản · Quản trị Điểm danh" };

type Props = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const [me, u, system] = await Promise.all([
    requireAdmin(),
    apiOrNull<AdminUserDetail>(`/v1/admin/users/${enc(id)}`),
    api<SystemInfo>("/v1/admin/system"),
  ]);
  if (!u) notFound();
  const self = u.id === me.id;
  const fixed = u.roleSource === "env";

  return (
    <>
      <PageHeader
        back={{ href: "/users", label: "Tài khoản" }}
        title={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Avatar userId={u.id} name={u.name} version={u.avatarVersion} size={48} />
            {u.name}
          </Box>
        }
        subtitle={u.email}
      />
      <Stack spacing={2}>
        <Section title="Thông tin">
          <Stack spacing={1}>
            <Box>
              <UserBadges role={u.role} roleSource={u.roleSource} disabled={u.disabled} />
            </Box>
            <Typography variant="body2">Tạo lúc: {formatDateTime(u.createdAt)}</Typography>
            {u.disabledAt && <Typography variant="body2">Bị khoá lúc: {formatDateTime(u.disabledAt)}</Typography>}
            <Typography variant="body2">
              Quản lý {u.ownedGroupCount} nhóm · tham gia {u.membershipCount} nhóm
            </Typography>
          </Stack>
        </Section>

        <Section title="Thao tác">
          {self ? (
            <Alert severity="info">Đây là tài khoản của bạn — không thao tác quản trị lên chính mình được.</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {u.disabled ? (
                  <ActionButton
                    action={enableUserAction.bind(null, u.id)}
                    startIcon={<LockOpenRounded />}
                    confirm={`Mở khoá tài khoản ${u.email}? Người này sẽ đăng nhập lại được.`}
                    confirmLabel="Mở khoá"
                  >
                    Mở khoá tài khoản
                  </ActionButton>
                ) : (
                  <ActionButton
                    action={disableUserAction.bind(null, u.id)}
                    danger
                    startIcon={<BlockRounded />}
                    disabled={fixed}
                    confirm={`Khoá tài khoản ${u.email}? Người này bị đăng xuất ngay và không đăng nhập được nữa. Các nhóm của họ vẫn giữ nguyên.`}
                    confirmLabel="Khoá"
                  >
                    Khoá tài khoản
                  </ActionButton>
                )}
                {u.role === "admin" ? (
                  <ActionButton
                    action={setRoleAction.bind(null, u.id, "user")}
                    startIcon={<PersonRemoveOutlined />}
                    disabled={fixed}
                    confirm={`Bỏ quyền quản trị của ${u.email}?`}
                    confirmLabel="Bỏ quyền"
                  >
                    Bỏ quyền quản trị
                  </ActionButton>
                ) : (
                  <ActionButton
                    action={setRoleAction.bind(null, u.id, "admin")}
                    startIcon={<AdminPanelSettingsOutlined />}
                    confirm={`Cấp quyền quản trị cho ${u.email}? Người này sẽ vào được trang quản trị và làm được mọi thao tác ở đây.`}
                    confirmLabel="Cấp quyền"
                  >
                    Cấp quyền quản trị
                  </ActionButton>
                )}
                <ActionButton
                  action={revokeSessionsAction.bind(null, u.id)}
                  startIcon={<LogoutRounded />}
                  confirm={`Đăng xuất ${u.email} khỏi mọi thiết bị? Họ cần đăng nhập lại.`}
                  confirmLabel="Đăng xuất"
                >
                  Đăng xuất mọi thiết bị
                </ActionButton>
                {system.features.email && (
                  <ActionButton
                    action={sendPasswordResetAction.bind(null, u.id)}
                    startIcon={<MailOutlineRounded />}
                    disabled={u.disabled}
                    confirm={`Gửi email đặt lại mật khẩu tới ${u.email}?`}
                    confirmLabel="Gửi"
                  >
                    Gửi email đặt lại mật khẩu
                  </ActionButton>
                )}
              </Box>
              {fixed && (
                <Typography variant="body2" color="text.secondary">
                  Đây là quản trị viên cố định (biến ADMIN_EMAILS trên Vercel): không khoá hay bỏ quyền được ở đây.
                </Typography>
              )}
            </Stack>
          )}
        </Section>

        <Section title={`Nhóm quản lý (${u.ownedGroups.length})`} flush>
          {u.ownedGroups.length === 0 ? (
            <EmptyText>Không quản lý nhóm nào.</EmptyText>
          ) : (
            <List disablePadding sx={{ mx: -1 }}>
              {u.ownedGroups.map((g) => (
                <ListLink key={g.id} href={`/groups/${g.id}`} sx={{ borderRadius: 2, px: 1, py: 1 }}>
                  <ListItemText
                    primary={g.name}
                    secondary={`${g.memberCount} thành viên${g.parentId ? " · nhóm con" : ""}`}
                    slotProps={{ primary: { fontWeight: 600 } }}
                  />
                </ListLink>
              ))}
            </List>
          )}
        </Section>

        <Section title={`Nhóm tham gia (${u.memberships.length})`} flush>
          {u.memberships.length === 0 ? (
            <EmptyText>Chưa liên kết với thành viên nào.</EmptyText>
          ) : (
            <List disablePadding sx={{ mx: -1 }}>
              {u.memberships.map((m) => (
                <ListLink key={m.memberId} href={`/groups/${m.groupId}`} sx={{ borderRadius: 2, px: 1, py: 1 }}>
                  <ListItemText primary={m.groupName} secondary={`Là ${m.memberName}`} slotProps={{ primary: { fontWeight: 600 } }} />
                </ListLink>
              ))}
            </List>
          )}
        </Section>
      </Stack>
    </>
  );
}
