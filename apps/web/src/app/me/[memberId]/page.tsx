import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { ZoomableAvatar } from "@/components/avatar-zoom";
import { GroupTabs } from "@/components/group-tabs";
import { PagedList } from "@/components/paged-list";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusChip, StatusCounts } from "@/components/status-chip";
import { formatDate } from "@/lib/format";
import { normalizeSearch } from "@/lib/search";
import { requireUser } from "@/lib/session";
import { getMyHistory, getRosterForMember } from "@/modules/members/membership.service";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch sử điểm danh · Điểm danh" };

type Props = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ linked?: string; tab?: string }>;
};

export default async function MyHistoryPage({ params, searchParams }: Props) {
  const { memberId } = await params;
  const { linked, tab } = await searchParams;
  const user = await requireUser();
  const [history, roster] = await Promise.all([
    getMyHistory(memberId, user.userId),
    getRosterForMember(memberId, user.userId),
  ]);
  if (!history || !roster) notFound();

  const percent = history.rate === null ? null : Math.round(history.rate * 100);

  const membersTab = (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle>Thành viên ({roster.length})</SectionTitle>
        <PagedList searchable={roster.length > 5}>
        <List dense disablePadding sx={{ mx: -1 }}>
          {roster.map((m, i) => {
            const isMe = m.id === memberId;
            return (
              <ListItem
                key={m.id}
                data-search={normalizeSearch(`${m.name} ${m.code}`)}
                divider={i < roster.length - 1}
                sx={{ px: 1, py: 0.75, borderRadius: isMe ? 2 : 0, bgcolor: isMe ? brand.tealLighter : undefined }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                  <Typography component="span" variant="caption" color="text.disabled" sx={{ minWidth: 22 }}>
                    {i + 1}.
                  </Typography>
                  {m.code && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {m.code}
                    </Typography>
                  )}
                  <Typography component="span" noWrap sx={{ fontWeight: isMe ? 700 : 400, minWidth: 0 }}>
                    {m.name}
                  </Typography>
                  {m.linked && (
                    <ZoomableAvatar userId={m.linked.userId} name={m.linked.name} version={m.linked.avatarVersion} size={28} />
                  )}
                  {isMe && (
                    <Chip label="Bạn" size="small" sx={{ ml: "auto", height: 22, bgcolor: brand.tealDark, color: "#fff", fontWeight: 600 }} />
                  )}
                </Box>
              </ListItem>
            );
          })}
        </List>
        </PagedList>
      </CardContent>
    </Card>
  );

  const historyTab = (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle>Lịch sử ({history.items.length} buổi)</SectionTitle>
        {history.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nhóm chưa có buổi điểm danh nào.
          </Typography>
        ) : (
          <List disablePadding>
            {history.items.map((it, i) => (
              <ListItem key={it.sessionId} disableGutters divider={i < history.items.length - 1} sx={{ py: 1.25, display: "block" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
                      {it.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(it.date)}
                    </Typography>
                  </Box>
                  {it.status ? (
                    <StatusChip status={it.status} count={0} hideCount />
                  ) : (
                    <Chip size="small" label="Chưa có kết quả" variant="outlined" />
                  )}
                </Box>
                {it.note && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
                    Ghi chú: {it.note}
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader
        title={history.groupName}
        subtitle={`Bạn là ${history.memberName}`}
        back={{ href: "/groups", label: "Nhóm của tôi" }}
      />

      <Stack spacing={2}>
        {linked && <Alert severity="success">Đã liên kết tài khoản. Từ giờ bạn có thể tự điểm danh bằng QR khi đã đăng nhập.</Alert>}

        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Chuyên cần</SectionTitle>
            {percent === null ? (
              <Typography variant="body2" color="text.secondary">
                Chưa có buổi điểm danh nào có kết quả.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                  <Typography sx={{ fontSize: 36, fontWeight: 800, color: brand.tealDark, lineHeight: 1 }}>{percent}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    có mặt trên {history.recorded} buổi
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4, my: 1.5 }} />
                <StatusCounts counts={history.counts} short={false} />
              </>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <GroupTabs
          initial={tab}
          tabs={[
            { key: "history", label: "Lịch sử", content: historyTab },
            { key: "members", label: "Thành viên", content: membersTab },
          ]}
        />
      </Box>
    </Box>
  );
}
