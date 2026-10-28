import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import GroupAddOutlined from "@mui/icons-material/GroupAddOutlined";
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
import { EditMemberButton, RenameGroupButton } from "@/components/edit-dialogs";
import { GroupInviteCard } from "@/components/group-invite-card";
import { MemberInviteButton } from "@/components/member-invite";
import { AppLink, ListLink } from "@/components/links";
import { ListSearch } from "@/components/list-search";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatusCounts } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import { formatDate, todayInputValue } from "@/lib/format";
import { normalizeSearch } from "@/lib/search";
import { requireUser } from "@/lib/session";
import { createSessionAction } from "@/modules/attendance/attendance.actions";
import { listSessionsWithCounts } from "@/modules/attendance/attendance.service";
import { createGroupAction, deleteGroupAction } from "@/modules/groups/group.actions";
import { getAncestors, getChildGroups, getOwnedGroup } from "@/modules/groups/group.service";
import { addMembersAction, deleteMemberAction } from "@/modules/members/member.actions";
import { listMembers } from "@/modules/members/member.service";
import { approveRequestAction, rejectRequestAction, unlinkMemberAction } from "@/modules/invites/invite.actions";
import { getActiveGroupInvite, listPendingRequests } from "@/modules/invites/invite.service";
import { buildShareLink } from "@/modules/invites/share";
import { getAccountsByIds } from "@/modules/users/user.service";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
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

  return (
    <>
      {/* Đường dẫn nhóm */}
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

      <PageHeader
        title={group.name}
        subtitle={`${members.length} thành viên · ${children.length} nhóm con · ${sessions.length} buổi điểm danh`}
        actions={
          <>
            <RenameGroupButton key={group.name} groupId={group.id} name={group.name} />
            {children.length === 0 && (
              <form action={deleteGroupAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <SubmitButton
                  variant="danger"
                  pendingText="Đang xóa..."
                  startIcon={<DeleteOutline />}
                  successMessage="Đã xóa nhóm"
                  confirmLabel="Xóa nhóm"
                  confirm={`Xóa nhóm "${group.name}" cùng toàn bộ thành viên và dữ liệu điểm danh? Không thể khôi phục.`}
                >
                  Xóa nhóm
                </SubmitButton>
              </form>
            )}
          </>
        }
      />

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

        {/* Điểm danh */}
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

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "start" }}>
          {/* Thành viên */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Thành viên ({members.length})</SectionTitle>
              {members.length > 5 && <ListSearch listId="member-list" />}
              {members.length > 0 && (
                <List id="member-list" dense disablePadding sx={{ mt: 1, mb: 2 }}>
                  {members.map((m, i) => (
                    <ListItem
                      key={m.id}
                      data-search={normalizeSearch(`${m.name} ${m.code}`)}
                      disableGutters
                      divider={i < members.length - 1}
                      secondaryAction={
                        <Stack direction="row" spacing={0.25}>
                          {m.linkedUserId ? (
                            <form action={unlinkMemberAction}>
                              <input type="hidden" name="memberId" value={m.id} />
                              <SubmitButton
                                variant="plain"
                                pendingText=""
                                successMessage="Đã hủy liên kết"
                                confirmLabel="Hủy liên kết"
                                sx={{ minWidth: 0, px: 1, color: "text.secondary" }}
                                confirm={`Hủy liên kết tài khoản ${accounts.get(m.linkedUserId)?.email ?? ""} khỏi "${m.name}"? Lịch sử điểm danh vẫn giữ nguyên.`}
                              >
                                <LinkOffRounded fontSize="small" aria-label={`Hủy liên kết ${m.name}`} />
                              </SubmitButton>
                            </form>
                          ) : (
                            <MemberInviteButton memberId={m.id} name={m.name} groupName={group.name} />
                          )}
                          <EditMemberButton key={`${m.name}|${m.code}`} memberId={m.id} name={m.name} code={m.code} />
                          <form action={deleteMemberAction}>
                            <input type="hidden" name="memberId" value={m.id} />
                            <SubmitButton
                              variant="plain"
                              pendingText=""
                              successMessage="Đã xóa thành viên"
                              confirmLabel="Xóa"
                              sx={{ minWidth: 0, px: 1, color: brand.red }}
                              confirm={`Xóa "${m.name}" khỏi nhóm? Toàn bộ lịch sử điểm danh của người này cũng sẽ bị xóa và không khôi phục được.`}
                            >
                              <DeleteOutline fontSize="small" aria-label={`Xóa ${m.name}`} />
                            </SubmitButton>
                          </form>
                        </Stack>
                      }
                      sx={{ pr: 15 }}
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
                                title={`Đã liên kết: ${accounts.get(m.linkedUserId)?.email ?? ""}`}
                                sx={{ display: "inline-flex", verticalAlign: "middle", ml: 1 }}
                              >
                                <ZoomableAvatar
                                  userId={m.linkedUserId}
                                  name={accounts.get(m.linkedUserId)?.name ?? m.name}
                                  version={accounts.get(m.linkedUserId)?.avatarVersion ?? null}
                                  caption={accounts.get(m.linkedUserId)?.email}
                                  size={28}
                                />
                              </Box>
                            )}
                          </>
                        }
                        slotProps={{ primary: { noWrap: true } }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <form action={addMembersAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <Stack spacing={1.5} sx={{ mt: members.length > 0 ? 0 : 1 }}>
                  {/* Ô nhiều dòng: cố định nhãn nằm trên viền và phần hở của viền,
                      vì nhãn nổi tự động bị lệch viền trên iPhone */}
                  <TextField
                    id="add-members"
                    name="members"
                    label="Thêm thành viên"
                    slotProps={{ inputLabel: { shrink: true }, input: { notched: true } }}
                    multiline
                    minRows={3}
                    required
                    placeholder={"Mỗi dòng một người, ví dụ:\nNguyễn Văn An\nHS002, Trần Thị Bình"}
                    helperText="Có thể dán từ Excel: cột Mã và cột Tên."
                  />
                  <Box>
                    <SubmitButton pendingText="Đang thêm..." startIcon={<GroupAddOutlined />} successMessage="Đã thêm thành viên">
                      Thêm
                    </SubmitButton>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>

          {/* Nhóm con */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Nhóm con ({children.length})</SectionTitle>
              {children.length > 0 && (
                <List disablePadding sx={{ mb: 2, mx: -1 }}>
                  {children.map((c) => (
                    <ListLink key={c.id} href={`/groups/${c.id}`} sx={{ borderRadius: 2, px: 1 }}>
                      <SubdirectoryArrowRightRounded fontSize="small" sx={{ color: "text.disabled", mr: 1 }} />
                      <ListItemText primary={c.name} slotProps={{ primary: { fontWeight: 500 } }} />
                      <ChevronRightRounded sx={{ color: "text.disabled" }} />
                    </ListLink>
                  ))}
                </List>
              )}
              <form action={createGroupAction}>
                <input type="hidden" name="parentId" value={group.id} />
                <Stack direction="row" spacing={1}>
                  <TextField name="name" label="Tên nhóm con" required />
                  <SubmitButton pendingText="..." startIcon={<AddRounded />} successMessage="Đã tạo nhóm con" sx={{ flexShrink: 0, height: 40 }}>
                    Tạo
                  </SubmitButton>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Box>

        <GroupInviteCard groupId={group.id} groupName={group.name} initialLink={groupLink} />
      </Stack>
    </>
  );
}
