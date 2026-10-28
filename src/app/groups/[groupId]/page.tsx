import AddRounded from "@mui/icons-material/AddRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
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
import { EditMemberButton, RenameGroupButton } from "@/components/edit-dialogs";
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

  return (
    <>
      {/* Đường dẫn nhóm */}
      <Breadcrumbs sx={{ mb: 1, fontSize: 14 }}>
        <AppLink href="/groups" color="text.secondary">
          Nhóm của tôi
        </AppLink>
        {ancestors.map((a) => (
          <AppLink key={a.id} href={`/groups/${a.id}`} color="text.secondary">
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
                      sx={{ pr: 11 }}
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
                  <TextField
                    name="members"
                    label="Thêm thành viên"
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
      </Stack>
    </>
  );
}
