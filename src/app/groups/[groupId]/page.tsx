import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import SubdirectoryArrowRightRounded from "@mui/icons-material/SubdirectoryArrowRightRounded";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { ZoomableAvatar } from "@/components/avatar-zoom";
import { AddMembersButton, CreateSubgroupButton, GroupPageHeader, MemberRowMenu } from "@/components/group-menus";
import { GroupTabs } from "@/components/group-tabs";
import { AppLink, ListLink } from "@/components/links";
import { PagedList } from "@/components/paged-list";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusCounts } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import { formatDate, todayInputValue } from "@/lib/format";
import { normalizeSearch } from "@/lib/search";
import { requireUser } from "@/lib/session";
import { createSessionAction } from "@/modules/attendance/attendance.actions";
import { listSessionsWithCounts } from "@/modules/attendance/attendance.service";
import { getAncestors, getChildGroups, getOwnedGroup } from "@/modules/groups/group.service";
import { listMembers } from "@/modules/members/member.service";
import { approveRequestAction, rejectRequestAction } from "@/modules/invites/invite.actions";
import { getActiveGroupInvite, listPendingRequests } from "@/modules/invites/invite.service";
import { buildShareLink } from "@/modules/invites/share";
import { getAccountsByIds } from "@/modules/users/user.service";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string }>; searchParams: Promise<{ tab?: string }> };

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const { tab } = await searchParams;
  const user = await requireUser();
  const group = await getOwnedGroup(groupId, user.userId);
  if (!group) notFound();

  const [ancestors, children, members, sessions] = await Promise.all([
    getAncestors(group, user.userId),
    getChildGroups(group.id, user.userId),
    listMembers(group.id),
    listSessionsWithCounts(group.id),
  ]);
  // Tài khoản đã liên kết với thành viên (tên, ảnh đại diện)
  const accounts = await getAccountsByIds(members.map((m) => m.linkedUserId).filter((id): id is string => !!id));
  // Link chung và các yêu cầu chờ duyệt
  const [activeInvite, requests] = await Promise.all([getActiveGroupInvite(group.id), listPendingRequests(group.id)]);
  const groupLink = activeInvite ? await buildShareLink(`/join/${activeInvite.token}`, null) : null;
  const requestAccounts = await getAccountsByIds(requests.map((r) => String(r.userId)));

  // ---------- Tab "Điểm danh" ----------
  const sessionsTab = (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle>Điểm danh</SectionTitle>
        {members.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Thêm thành viên trước khi điểm danh.
          </Typography>
        ) : (
          <form action={createSessionAction}>
            <input type="hidden" name="groupId" value={group.id} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField name="title" label="Tên buổi" placeholder="Buổi sáng, Tiết 1..." />
              <TextField
                name="date"
                label="Ngày"
                type="date"
                required
                defaultValue={todayInputValue()}
                sx={{ width: { sm: 200 }, flexShrink: 0 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <SubmitButton pendingText="Đang tạo..." startIcon={<EventAvailableRounded />} sx={{ flexShrink: 0, height: 40 }}>
                Bắt đầu điểm danh
              </SubmitButton>
            </Stack>
          </form>
        )}

        {sessions.length > 0 && (
          <List disablePadding sx={{ mt: 2, mx: -1 }}>
            {sessions.map((s, i) => (
              <Fragment key={s.id}>
                {i > 0 && <Divider component="li" />}
                <ListLink href={`/groups/${group.id}/sessions/${s.id}`} sx={{ borderRadius: 2, py: 1.25, px: 1, display: "block" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{s.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(s.date)}
                    </Typography>
                    {s.selfCheckInOpen && (
                      <Chip
                        size="small"
                        icon={<QrCode2Rounded />}
                        label="QR đang mở"
                        sx={{ bgcolor: brand.tealLighter, color: brand.tealDarker, "& .MuiChip-icon": { color: brand.tealDark } }}
                      />
                    )}
                  </Stack>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <StatusCounts counts={s.counts} />
                  </Box>
                </ListLink>
              </Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  // ---------- Tab "Thành viên" ----------
  const membersTab = (
    <Stack spacing={2}>
      {/* Yêu cầu liên kết chờ duyệt (qua link chung) */}
      {requests.length > 0 && (
        <Card sx={{ borderColor: brand.orange }}>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Yêu cầu chờ duyệt ({requests.length})</SectionTitle>
            <List disablePadding>
              {requests.map((r, i) => {
                const acc = requestAccounts.get(String(r.userId));
                const mem = members.find((m) => m.id === String(r.memberId));
                return (
                  <ListItem key={String(r._id)} disableGutters divider={i < requests.length - 1} sx={{ py: 1.25, flexWrap: "wrap", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: "1 1 220px", minWidth: 0 }}>
                      <ZoomableAvatar userId={String(r.userId)} name={acc?.name ?? "?"} version={acc?.avatarVersion ?? null} caption={acc?.email} size={36} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600 }}>
                          {acc?.name ?? "Tài khoản"} <Typography component="span" variant="body2" color="text.secondary">({acc?.email ?? ""})</Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Xin nhận tên <b>{mem?.name ?? "(đã xóa)"}</b>
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <form action={rejectRequestAction}>
                        <input type="hidden" name="requestId" value={String(r._id)} />
                        <SubmitButton variant="ghost" pendingText="..." startIcon={<CloseRounded />} successMessage="Đã từ chối">
                          Từ chối
                        </SubmitButton>
                      </form>
                      <form action={approveRequestAction}>
                        <input type="hidden" name="requestId" value={String(r._id)} />
                        <SubmitButton pendingText="..." startIcon={<CheckRounded />} successMessage="Đã duyệt">
                          Duyệt
                        </SubmitButton>
                      </form>
                    </Stack>
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <SectionTitle extra={<AddMembersButton groupId={group.id} />}>Thành viên ({members.length})</SectionTitle>
          {members.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Chưa có thành viên.
            </Typography>
          ) : (
            <PagedList searchable={members.length > 5}>
              <List dense disablePadding sx={{ mt: 1 }}>
                {members.map((m, i) => {
                  const acc = m.linkedUserId ? accounts.get(m.linkedUserId) : undefined;
                  return (
                    <ListItem
                      key={m.id}
                      data-search={normalizeSearch(`${m.name} ${m.code}`)}
                      disableGutters
                      divider={i < members.length - 1}
                      secondaryAction={
                        <MemberRowMenu
                          memberId={m.id}
                          name={m.name}
                          code={m.code}
                          groupName={group.name}
                          linkedEmail={m.linkedUserId ? (acc?.email ?? "") : null}
                        />
                      }
                      sx={{ pr: 5 }}
                    >
                      <ListItemText
                        primary={
                          <>
                            <Typography component="span" variant="caption" color="text.disabled" sx={{ mr: 1 }}>
                              {i + 1}.
                            </Typography>
                            {m.code && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                {m.code}
                              </Typography>
                            )}
                            {m.name}
                            {m.linkedUserId && (
                              <Box
                                component="span"
                                title={`Đã liên kết: ${acc?.email ?? ""}`}
                                sx={{ display: "inline-flex", verticalAlign: "middle", ml: 1 }}
                              >
                                <ZoomableAvatar
                                  userId={m.linkedUserId}
                                  name={acc?.name ?? m.name}
                                  version={acc?.avatarVersion ?? null}
                                  caption={acc?.email}
                                  size={28}
                                />
                              </Box>
                            )}
                          </>
                        }
                        slotProps={{ primary: { noWrap: true } }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </PagedList>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  // ---------- Tab "Nhóm con" ----------
  const childrenTab = (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle extra={<CreateSubgroupButton parentId={group.id} />}>Nhóm con ({children.length})</SectionTitle>
        {children.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Chưa có nhóm con.
          </Typography>
        ) : (
          <List disablePadding sx={{ mx: -1 }}>
            {children.map((c) => (
              <ListLink key={c.id} href={`/groups/${c.id}`} sx={{ borderRadius: 2, px: 1 }}>
                <SubdirectoryArrowRightRounded fontSize="small" sx={{ color: "text.disabled", mr: 1 }} />
                <ListItemText primary={c.name} slotProps={{ primary: { fontWeight: 500 } }} />
                <ChevronRightRounded sx={{ color: "text.disabled" }} />
              </ListLink>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Đường dẫn cùng kiểu với nút quay lại "← …" ở các trang khác */}
      <Breadcrumbs sx={{ mb: 1, typography: "body2", color: "text.secondary" }}>
        <AppLink
          href="/groups"
          color="text.secondary"
          variant="body2"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
        >
          <ArrowBackRounded sx={{ fontSize: 16 }} />
          Nhóm của tôi
        </AppLink>
        {ancestors.map((a) => (
          <AppLink key={a.id} href={`/groups/${a.id}`} color="text.secondary" variant="body2">
            {a.name}
          </AppLink>
        ))}
      </Breadcrumbs>

      <GroupPageHeader
        key={group.name}
        groupId={group.id}
        groupName={group.name}
        subtitle={`${members.length} thành viên · ${children.length} nhóm con · ${sessions.length} buổi điểm danh`}
        canDelete={children.length === 0}
        inviteLink={groupLink}
      />

      <GroupTabs
        initial={tab}
        tabs={[
          { key: "sessions", label: "Điểm danh", content: sessionsTab },
          { key: "members", label: "Thành viên", badge: requests.length, content: membersTab },
          { key: "subgroups", label: "Nhóm con", content: childrenTab },
        ]}
      />
    </>
  );
}
