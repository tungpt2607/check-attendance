import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { ZoomableAvatar } from "@/components/avatar-zoom";
import { MemberRowMenu } from "@/components/group-menus";
import { ListLink } from "@/components/links";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { RateSummary } from "@/components/rate";
import { StatusChip } from "@/components/status-chip";
import { formatDate, formatTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getMemberHistory } from "@/modules/attendance/stats.service";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { getMember } from "@/modules/members/member.service";
import { getAccountsByIds } from "@/modules/users/user.service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string; memberId: string }> };

/** Thống kê chuyên cần của một thành viên, chủ nhóm xem */
export default async function MemberStatsPage({ params }: Props) {
  const { groupId, memberId } = await params;
  const user = await requireUser();
  const group = await getOwnedGroup(groupId, user.userId);
  const member = group ? await getMember(memberId) : null;
  if (!group || !member || member.groupId !== group.id) notFound();

  const [{ items, rate }, accounts] = await Promise.all([
    getMemberHistory(member.id, group.id),
    getAccountsByIds(member.linkedUserId ? [member.linkedUserId] : []),
  ]);
  const acc = member.linkedUserId ? accounts.get(member.linkedUserId) : undefined;

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader
        title={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
            {acc && (
              <ZoomableAvatar userId={acc.id} name={acc.name} version={acc.avatarVersion} caption={acc.email} size={40} />
            )}
            {member.name}
          </Box>
        }
        subtitle={[member.code && `Mã ${member.code}`, acc ? `Đã liên kết: ${acc.email}` : "Chưa liên kết tài khoản"]
          .filter(Boolean)
          .join(" · ")}
        back={{ href: `/groups/${group.id}?tab=members`, label: group.name }}
        actions={
          <MemberRowMenu
            key={`${member.name}|${member.code}`}
            memberId={member.id}
            name={member.name}
            code={member.code}
            groupName={group.name}
            linkedEmail={member.linkedUserId ? (acc?.email ?? "") : null}
            onDetailPage
          />
        }
      />

      <Stack spacing={2}>
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Chuyên cần</SectionTitle>
            <RateSummary rate={rate.rate} recorded={rate.recorded} counts={rate.counts} />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Lịch sử ({items.length} buổi)</SectionTitle>
            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nhóm chưa có buổi điểm danh nào.
              </Typography>
            ) : (
              <List disablePadding sx={{ mx: -1 }}>
                {items.map((it, i) => (
                  <Fragment key={it.sessionId}>
                    {i > 0 && <Divider component="li" />}
                    <ListLink href={`/groups/${group.id}/sessions/${it.sessionId}`} sx={{ borderRadius: 2, px: 1, py: 1.25, display: "block" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontWeight: 600 }}>
                            {it.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {formatDate(it.date)}
                            {it.checkedInAt && (
                              <>
                                {" · "}
                                <QrCode2Rounded sx={{ fontSize: 14 }} />
                                tự điểm danh {formatTime(it.checkedInAt)}
                              </>
                            )}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                          {it.status ? (
                            <StatusChip status={it.status} count={0} hideCount />
                          ) : (
                            <Chip size="small" label="Chưa có kết quả" variant="outlined" />
                          )}
                          <ChevronRightRounded sx={{ color: "text.disabled" }} />
                        </Box>
                      </Box>
                      {it.note && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
                          Ghi chú: {it.note}
                        </Typography>
                      )}
                    </ListLink>
                  </Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
