import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS, type AuditAction, type AuditList } from "@check-attendance/shared/admin";
import { formatDateTime } from "@check-attendance/shared/format";
import { brand } from "@check-attendance/ui/brand";
import { AppLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { EmptyText, Section } from "@/components/bits";
import { Pager } from "@/components/pager";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhật ký quản trị · Quản trị Điểm danh" };

type Props = { searchParams: Promise<{ action?: string; page?: string }> };

/** Link tới đối tượng (nếu còn trang để mở) */
function targetHref(kind: string | null, id: string | null): string | null {
  if (!id) return null;
  if (kind === "user") return `/users/${id}`;
  return null;
}

export default async function AuditPage({ searchParams }: Props) {
  const sp = await searchParams;
  const action = AUDIT_ACTIONS.includes(sp.action as AuditAction) ? (sp.action as AuditAction) : undefined;
  const query = new URLSearchParams({ page: String(Math.max(1, Number(sp.page) || 1)) });
  if (action) query.set("action", action);
  const data = await api<AuditList>(`/v1/admin/audit?${query}`);

  return (
    <>
      <PageHeader title="Nhật ký quản trị" subtitle="Ai đã làm gì, lúc nào (mới nhất trước)" />
      <Section title="Lọc theo thao tác">
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <Chip label="Tất cả" component="a" href="/audit" clickable color={action ? "default" : "primary"} />
          {AUDIT_ACTIONS.map((a) => (
            <Chip key={a} label={AUDIT_ACTION_LABELS[a]} component="a" href={`/audit?action=${a}`} clickable color={action === a ? "primary" : "default"} />
          ))}
        </Box>
        {data.items.length === 0 ? (
          <EmptyText>Chưa có thao tác nào.</EmptyText>
        ) : (
          <List disablePadding>
            {data.items.map((a) => {
              const href = targetHref(a.targetKind, a.targetId);
              return (
                <ListItem key={a.id} disableGutters divider sx={{ py: 1.25, display: "block" }}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{AUDIT_ACTION_LABELS[a.action]}</Typography>
                    {a.targetLabel &&
                      (href ? (
                        <AppLink href={href} variant="body2">
                          {a.targetLabel}
                        </AppLink>
                      ) : (
                        <Typography variant="body2">{a.targetLabel}</Typography>
                      ))}
                  </Box>
                  {a.detail && (
                    <Typography variant="body2" color="text.secondary">
                      {a.detail}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: brand.inkMuted }}>
                    {formatDateTime(a.createdAt)} · {a.actor ? `${a.actor.name} (${a.actor.email})` : "(không rõ)"}
                  </Typography>
                </ListItem>
              );
            })}
          </List>
        )}
        <Pager basePath="/audit" params={{ action }} page={data.page} pageSize={data.pageSize} total={data.total} />
      </Section>
    </>
  );
}
