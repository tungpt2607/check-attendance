import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import type { AdminUserList } from "@check-attendance/shared/admin";
import { formatDateTime } from "@check-attendance/shared/format";
import { Avatar } from "@check-attendance/ui/avatar";
import { ListLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { EmptyText, UserBadges } from "@/components/bits";
import { Pager } from "@/components/pager";
import { SearchBar } from "@/components/search-bar";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản · Quản trị Điểm danh" };

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function UsersPage({ searchParams }: Props) {
  const { q, page } = await searchParams;
  const query = new URLSearchParams({ page: String(Math.max(1, Number(page) || 1)) });
  if (q) query.set("q", q);
  const data = await api<AdminUserList>(`/v1/admin/users?${query}`);

  return (
    <>
      <PageHeader title="Tài khoản" subtitle={`${data.total.toLocaleString("vi-VN")} tài khoản${q ? ` khớp "${q}"` : ""}`} />
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <SearchBar placeholder="Tìm theo tên hoặc email" />
          {data.items.length === 0 ? (
            <EmptyText>Không tìm thấy tài khoản nào.</EmptyText>
          ) : (
            <List disablePadding sx={{ mx: -1, mt: 1.5 }}>
              {data.items.map((u) => (
                <ListLink key={u.id} href={`/users/${u.id}`} sx={{ borderRadius: 2, px: 1, py: 1.25, gap: 1.5, alignItems: "flex-start" }}>
                  <Avatar userId={u.id} name={u.name} version={u.avatarVersion} size={40} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 600 }}>{u.name}</Typography>
                      <UserBadges role={u.role} roleSource={u.roleSource} disabled={u.disabled} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {u.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quản lý {u.ownedGroupCount} nhóm · tham gia {u.membershipCount} nhóm · tạo {formatDateTime(u.createdAt)}
                    </Typography>
                  </Box>
                </ListLink>
              ))}
            </List>
          )}
          <Pager basePath="/users" params={{ q }} page={data.page} pageSize={data.pageSize} total={data.total} />
        </CardContent>
      </Card>
    </>
  );
}
