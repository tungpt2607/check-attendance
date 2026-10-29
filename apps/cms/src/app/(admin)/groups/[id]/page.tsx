import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import type { AdminGroupDetail } from "@check-attendance/shared/admin";
import { formatDate, formatDateTime } from "@check-attendance/shared/format";
import { normalizeSearch } from "@check-attendance/shared/search";
import { STATUS_LABELS } from "@check-attendance/shared/statuses";
import { ActionButton } from "@check-attendance/ui/action-button";
import { Avatar } from "@check-attendance/ui/avatar";
import { AppLink, ListLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { PagedList } from "@check-attendance/ui/paged-list";
import { EmptyText, RateText, Section } from "@/components/bits";
import { apiOrNull, enc } from "@/lib/api";
import { deleteGroupAction } from "@/modules/admin.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhóm · Quản trị Điểm danh" };

type Props = { params: Promise<{ id: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params;
  const g = await apiOrNull<AdminGroupDetail>(`/v1/admin/groups/${enc(id)}`);
  if (!g) notFound();

  const deleteMessage = (
    <>
      Xoá nhóm <b>{g.name}</b>
      {g.descendantCount > 0 && (
        <>
          {" "}
          cùng <b>{g.descendantCount} nhóm con</b> bên trong
        </>
      )}
      ? Mọi thành viên, buổi điểm danh và kết quả của {g.descendantCount > 0 ? "các nhóm này" : "nhóm"} sẽ bị xoá vĩnh viễn, không khôi phục
      được. Thao tác được ghi vào nhật ký quản trị.
    </>
  );

  return (
    <>
      <PageHeader back={{ href: "/groups", label: "Nhóm" }} title={g.name} subtitle={g.path ? `${g.path} / ${g.name}` : "Nhóm gốc"} />
      <Stack spacing={2}>
        <Section title="Thông tin">
          <Stack spacing={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              {g.owner && <Avatar userId={g.owner.id} name={g.owner.name} version={g.owner.avatarVersion} size={32} />}
              <Typography variant="body2">
                Chủ nhóm:{" "}
                {g.owner ? (
                  <AppLink href={`/users/${g.owner.id}`} fontWeight={600}>
                    {g.owner.name}
                  </AppLink>
                ) : (
                  "(không còn)"
                )}
                {g.owner && ` · ${g.owner.email}`}
              </Typography>
            </Box>
            <Typography variant="body2">Tạo lúc: {formatDateTime(g.createdAt)}</Typography>
            <Typography variant="body2">
              {g.memberCount} thành viên · {g.sessionCount} buổi · {g.childCount} nhóm con trực tiếp
              {g.descendantCount > g.childCount ? ` (${g.descendantCount} nhóm con các cấp)` : ""}
            </Typography>
            <Typography variant="body2">
              Chuyên cần {g.descendantCount > 0 ? "cả nhánh" : ""}: <RateText rate={g.branchStats?.rate ?? null} />
            </Typography>
            {g.ancestors.length > 0 && (
              <Typography variant="body2">
                Nhóm cha:{" "}
                {g.ancestors.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && " / "}
                    <AppLink href={`/groups/${a.id}`}>{a.name}</AppLink>
                  </span>
                ))}
              </Typography>
            )}
          </Stack>
        </Section>

        {g.children.length > 0 && (
          <Section title={`Nhóm con (${g.children.length})`} flush>
            <List disablePadding sx={{ mx: -1 }}>
              {g.children.map((c) => (
                <ListLink key={c.id} href={`/groups/${c.id}`} sx={{ borderRadius: 2, px: 1, py: 1 }}>
                  <ListItemText primary={c.name} secondary={`${c.memberCount} thành viên`} slotProps={{ primary: { fontWeight: 600 } }} />
                </ListLink>
              ))}
            </List>
          </Section>
        )}

        <Section title={`Thành viên (${g.members.length})`} flush>
          {g.members.length === 0 ? (
            <EmptyText>Chưa có thành viên.</EmptyText>
          ) : (
            <PagedList searchable={g.members.length > 5} placeholder="Tìm thành viên...">
              <List disablePadding>
              {g.members.map((m) => (
                <ListItem key={m.id} data-search={normalizeSearch(`${m.name} ${m.code}`)} disableGutters divider sx={{ py: 1, gap: 1.5 }}>
                  <ListItemText
                    primary={m.code ? `${m.name} · ${m.code}` : m.name}
                    secondary={m.linkedAccount ? `Liên kết: ${m.linkedAccount.name} (${m.linkedAccount.email})` : "Chưa liên kết tài khoản"}
                    slotProps={{ primary: { fontWeight: 600 } }}
                  />
                  <RateText rate={m.rate} />
                </ListItem>
              ))}
              </List>
            </PagedList>
          )}
        </Section>

        <Section title={`Buổi điểm danh (${g.sessions.length})`} flush>
          {g.sessions.length === 0 ? (
            <EmptyText>Chưa có buổi điểm danh.</EmptyText>
          ) : (
            <PagedList>
              <List disablePadding>
              {g.sessions.map((s) => (
                <ListItem key={s.id} data-search={normalizeSearch(s.title)} disableGutters divider sx={{ py: 1 }}>
                  <ListItemText
                    primary={`${formatDate(s.date)} · ${s.title}`}
                    secondary={
                      s.total === 0
                        ? "Chưa có kết quả"
                        : (Object.entries(s.counts) as [keyof typeof STATUS_LABELS, number][])
                            .map(([k, n]) => `${STATUS_LABELS[k].label} ${n}`)
                            .join(" · ")
                    }
                    slotProps={{ primary: { fontWeight: 600 } }}
                  />
                </ListItem>
              ))}
              </List>
            </PagedList>
          )}
        </Section>

        <Section title="Vùng nguy hiểm">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Xoá nhóm vi phạm hoặc rác. Xoá nhóm là xoá luôn mọi nhóm con, thành viên và buổi điểm danh bên trong.
          </Typography>
          <ActionButton
            action={deleteGroupAction.bind(null, g.id)}
            danger
            variant="contained"
            startIcon={<DeleteOutlineRounded />}
            confirm={deleteMessage}
            confirmLabel="Xoá vĩnh viễn"
          >
            Xoá nhóm{g.descendantCount > 0 ? ` và ${g.descendantCount} nhóm con` : ""}
          </ActionButton>
        </Section>
      </Stack>
    </>
  );
}
