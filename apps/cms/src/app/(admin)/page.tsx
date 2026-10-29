import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import type { AdminStats } from "@check-attendance/shared/admin";
import { formatDateTime } from "@check-attendance/shared/format";
import { Avatar } from "@check-attendance/ui/avatar";
import { ListLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { Section, StatTile } from "@/components/bits";
import { MiniBars } from "@/components/mini-bars";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan · Quản trị Điểm danh" };

export default async function DashboardPage() {
  const s = await api<AdminStats>("/v1/admin/stats");
  const t = s.totals;
  return (
    <>
      <PageHeader title="Tổng quan" subtitle="Số liệu toàn hệ thống" />
      <Stack spacing={2}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
          <StatTile label="Tài khoản" value={t.users} hint={t.disabledUsers > 0 ? `${t.disabledUsers} đang bị khoá` : undefined} />
          <StatTile label="Nhóm" value={t.groups} />
          <StatTile label="Thành viên" value={t.members} hint={`${t.linkedMembers} đã liên kết tài khoản`} />
          <StatTile label="Buổi điểm danh" value={t.sessions} />
          <StatTile label="Lượt tự điểm danh QR" value={t.selfCheckins} />
        </Box>

        <Section title="Hoạt động 30 ngày">
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            <MiniBars title="Tài khoản mới" points={s.daily.map((d) => ({ date: d.date, value: d.newUsers }))} />
            <MiniBars title="Buổi điểm danh mới" points={s.daily.map((d) => ({ date: d.date, value: d.sessions }))} />
            <MiniBars title="Lượt tự điểm danh QR" points={s.daily.map((d) => ({ date: d.date, value: d.selfCheckins }))} />
          </Box>
        </Section>

        <Section title="Tài khoản mới đăng ký" flush>
          <List disablePadding sx={{ mx: -1 }}>
            {s.recentUsers.map((u) => (
              <ListLink key={u.id} href={`/users/${u.id}`} sx={{ borderRadius: 2, px: 1, py: 1, gap: 1.5 }}>
                <Avatar userId={u.id} name={u.name} version={u.avatarVersion} size={36} />
                <ListItemText primary={u.name} secondary={u.email} slotProps={{ primary: { fontWeight: 600 } }} />
                <Box sx={{ color: "text.secondary", fontSize: 13, flexShrink: 0 }}>{formatDateTime(u.createdAt)}</Box>
              </ListLink>
            ))}
          </List>
        </Section>
      </Stack>
    </>
  );
}
