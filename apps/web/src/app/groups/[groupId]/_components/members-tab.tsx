// Tab "Thành viên" của trang nhóm: yêu cầu chờ duyệt + danh sách thành viên kèm % chuyên cần
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { LinkRequestRow, MemberRow } from "@check-attendance/shared/api";
import { normalizeSearch } from "@check-attendance/shared/search";
import { ZoomableAvatar } from "@/components/avatar-zoom";
import { AddMembersButton } from "@/components/group-create-buttons";
import { MemberRowMenu } from "@/components/member-row-menu";
import { ListLink } from "@/components/links";
import { MemberSortToggle, type MemberSort } from "@/components/member-sort";
import { PagedList } from "@/components/paged-list";
import { SectionTitle } from "@/components/page-header";
import { RateBadge } from "@/components/rate";
import { SubmitButton } from "@/components/submit-button";
import { approveRequestAction, rejectRequestAction } from "@/modules/invites/invite.actions";
import { brand } from "@/theme/brand";

/** Yêu cầu liên kết tài khoản chờ chủ nhóm duyệt (qua link tham gia nhóm) */
function PendingRequests({ requests }: { requests: LinkRequestRow[] }) {
  return (
    <Card sx={{ borderColor: brand.orange }}>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle>Yêu cầu chờ duyệt ({requests.length})</SectionTitle>
        <List disablePadding>
          {requests.map((r, i) => {
            const acc = r.account;
            return (
              <ListItem key={r.id} disableGutters divider={i < requests.length - 1} sx={{ py: 1.25, flexWrap: "wrap", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: "1 1 220px", minWidth: 0 }}>
                  <ZoomableAvatar userId={acc?.id ?? ""} name={acc?.name ?? "?"} version={acc?.avatarVersion ?? null} caption={acc?.email} size={36} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
                      {acc?.name ?? "Tài khoản"} <Typography component="span" variant="body2" color="text.secondary">({acc?.email ?? ""})</Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Xin nhận tên <b>{r.memberName ?? "(đã xóa)"}</b>
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                  <form action={rejectRequestAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <SubmitButton variant="ghost" pendingText="..." startIcon={<CloseRounded />} successMessage="Đã từ chối">
                      Từ chối
                    </SubmitButton>
                  </form>
                  <form action={approveRequestAction}>
                    <input type="hidden" name="requestId" value={r.id} />
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
  );
}

type Props = {
  group: { id: string; name: string };
  /** Đã xếp theo lựa chọn (tên hoặc chuyên cần) */
  members: MemberRow[];
  requests: LinkRequestRow[];
  sort: MemberSort;
};

export function MembersTab({ group, members, requests, sort }: Props) {
  return (
    <Stack spacing={2}>
      {requests.length > 0 && <PendingRequests requests={requests} />}

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <SectionTitle extra={<AddMembersButton groupId={group.id} />}>Thành viên ({members.length})</SectionTitle>
          {members.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Chưa có thành viên.
            </Typography>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                <MemberSortToggle value={sort} />
              </Box>
              <PagedList searchable={members.length > 5}>
                <List dense disablePadding sx={{ mt: 1 }}>
                  {members.map((m, i) => {
                    const acc = m.linkedAccount;
                    const r = m.stats;
                    return (
                      <ListItem
                        key={m.id}
                        data-search={normalizeSearch(`${m.name} ${m.code}`)}
                        disablePadding
                        divider={i < members.length - 1}
                        secondaryAction={
                          <Stack direction="row" sx={{ alignItems: "center", gap: 0.25 }}>
                            <RateBadge
                              rate={r.rate}
                              title={r.recorded > 0 ? `Có mặt/muộn ${(r.counts.present ?? 0) + (r.counts.late ?? 0)}/${r.recorded} buổi` : "Chưa có kết quả"}
                            />
                            <MemberRowMenu
                              memberId={m.id}
                              name={m.name}
                              code={m.code}
                              groupName={group.name}
                              linkedEmail={acc ? acc.email : null}
                            />
                          </Stack>
                        }
                        sx={{ "& .MuiListItemButton-root": { pr: 11 } }}
                      >
                        <ListLink href={`/groups/${group.id}/members/${m.id}`} sx={{ borderRadius: 2, px: 0.5, py: 0.75 }}>
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
                                {acc && (
                                  <Box
                                    component="span"
                                    title={`Đã liên kết: ${acc?.email ?? ""}`}
                                    sx={{ display: "inline-flex", verticalAlign: "middle", ml: 1 }}
                                  >
                                    <ZoomableAvatar
                                      userId={acc.id}
                                      name={acc?.name ?? m.name}
                                      version={acc?.avatarVersion ?? null}
                                      caption={acc?.email}
                                      size={28}
                                      insideLink
                                    />
                                  </Box>
                                )}
                              </>
                            }
                            slotProps={{ primary: { noWrap: true } }}
                          />
                        </ListLink>
                      </ListItem>
                    );
                  })}
                </List>
              </PagedList>
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
