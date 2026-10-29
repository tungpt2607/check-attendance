import FolderOutlined from "@mui/icons-material/FolderOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import type { AdminGroupList } from "@check-attendance/shared/admin";
import { formatDateTime } from "@check-attendance/shared/format";
import { brand } from "@check-attendance/ui/brand";
import { ListLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { EmptyText } from "@/components/bits";
import { Pager } from "@/components/pager";
import { SearchBar } from "@/components/search-bar";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhóm · Quản trị Điểm danh" };

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function GroupsPage({ searchParams }: Props) {
  const { q, page } = await searchParams;
  const query = new URLSearchParams({ page: String(Math.max(1, Number(page) || 1)) });
  if (q) query.set("q", q);
  const data = await api<AdminGroupList>(`/v1/admin/groups?${query}`);

  return (
    <>
      <PageHeader title="Nhóm" subtitle={`${data.total.toLocaleString("vi-VN")} nhóm${q ? ` khớp "${q}"` : ""} (gồm cả nhóm con)`} />
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <SearchBar placeholder="Tìm theo tên nhóm hoặc tên/email chủ nhóm" />
          {data.items.length === 0 ? (
            <EmptyText>Không tìm thấy nhóm nào.</EmptyText>
          ) : (
            <List disablePadding sx={{ mx: -1, mt: 1.5 }}>
              {data.items.map((g) => (
                <ListLink key={g.id} href={`/groups/${g.id}`} sx={{ borderRadius: 2, px: 1, py: 1.25, gap: 1.5, alignItems: "flex-start" }}>
                  <FolderOutlined sx={{ color: g.parentId ? "text.disabled" : brand.tealDark, mt: 0.25 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    {g.path && (
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {g.path} /
                      </Typography>
                    )}
                    <Typography sx={{ fontWeight: 600 }}>{g.name}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Chủ nhóm: {g.owner ? `${g.owner.name} (${g.owner.email})` : "(không còn)"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {g.memberCount} thành viên · {g.sessionCount} buổi · {g.childCount} nhóm con · tạo {formatDateTime(g.createdAt)}
                    </Typography>
                  </Box>
                </ListLink>
              ))}
            </List>
          )}
          <Pager basePath="/groups" params={{ q }} page={data.page} pageSize={data.pageSize} total={data.total} />
        </CardContent>
      </Card>
    </>
  );
}
