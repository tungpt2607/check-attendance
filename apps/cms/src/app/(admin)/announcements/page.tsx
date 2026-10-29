import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import type { AnnouncementAudience, AnnouncementList } from "@check-attendance/shared/admin";
import { formatDateTime } from "@check-attendance/shared/format";
import { PageHeader } from "@check-attendance/ui/page-header";
import { AnnouncementForm } from "@/components/announcement-form";
import { EmptyText, Section } from "@/components/bits";
import { Pager } from "@/components/pager";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thông báo hệ thống · Quản trị Điểm danh" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AnnouncementsPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const [audience, history] = await Promise.all([
    api<AnnouncementAudience>("/v1/admin/announcements/audience"),
    api<AnnouncementList>(`/v1/admin/announcements?page=${p}`),
  ]);

  return (
    <>
      <PageHeader
        title="Thông báo hệ thống"
        subtitle={`Gửi tới mọi tài khoản đang hoạt động (${audience.users} tài khoản) — hiện trong chuông thông báo của web người dùng`}
      />
      <Stack spacing={2}>
        <Section title="Gửi thông báo mới">
          <AnnouncementForm audience={audience} />
        </Section>
        <Section title="Đã gửi">
          {history.items.length === 0 ? (
            <EmptyText>Chưa gửi thông báo nào.</EmptyText>
          ) : (
            <List disablePadding>
              {history.items.map((a) => (
                <ListItem key={a.id} disableGutters divider sx={{ py: 1.25, alignItems: "flex-start" }}>
                  <ListItemText
                    primary={a.title}
                    secondary={
                      <>
                        {a.message && (
                          <span style={{ display: "block", whiteSpace: "pre-line", marginBottom: 4 }}>{a.message}</span>
                        )}
                        {`${formatDateTime(a.createdAt)} · ${a.actor?.name ?? "?"} · ${a.recipientCount} người nhận${a.email ? ` · ${a.emailCount} email` : ""}${a.href ? ` · mở ${a.href}` : ""}`}
                      </>
                    }
                    slotProps={{ primary: { fontWeight: 600 } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Pager basePath="/announcements" params={{}} page={history.page} pageSize={history.pageSize} total={history.total} />
        </Section>
      </Stack>
    </>
  );
}
