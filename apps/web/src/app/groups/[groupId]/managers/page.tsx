import Box from "@mui/material/Box";
import { notFound } from "next/navigation";
import type { GroupManagers, MemberRow } from "@check-attendance/shared/api";
import type { EmailSuggestion } from "@check-attendance/ui/email-autocomplete";
import { PageHeader } from "@check-attendance/ui/page-header";
import { ManagersPanel } from "@/components/managers/managers-panel";
import { apiOrNull, enc } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { fetchGroup } from "@/modules/groups/group.api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Người quản lý · Điểm danh" };

type Props = { params: Promise<{ groupId: string }> };

/** Chủ nhóm và người quản lý; chủ nhóm thêm/sửa quyền/gỡ quản lý, chuyển quyền chủ nhóm */
export default async function ManagersPage({ params }: Props) {
  const { groupId } = await params;
  const user = await requireUser();
  const [group, data, membersRes] = await Promise.all([
    fetchGroup(groupId),
    apiOrNull<GroupManagers>(`/v1/groups/${enc(groupId)}/managers`),
    apiOrNull<{ members: MemberRow[] }>(`/v1/groups/${enc(groupId)}/members`),
  ]);
  if (!group || !data) notFound();

  // Gợi ý email khi thêm quản lý / chuyển chủ nhóm: thành viên đã liên kết tài khoản trong nhóm
  // (bỏ chủ nhóm, người đang là quản lý, và tài khoản trùng)
  const taken = new Set([data.owner?.id, ...data.managers.map((m) => m.account.id)]);
  const seen = new Set<string>();
  const suggestions: EmailSuggestion[] = [];
  for (const m of membersRes?.members ?? []) {
    const a = m.linkedAccount;
    if (!a || taken.has(a.id) || seen.has(a.id)) continue;
    seen.add(a.id);
    suggestions.push({ userId: a.id, name: a.name, email: a.email, avatarVersion: a.avatarVersion });
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader
        title="Người quản lý"
        subtitle={data.access.role === "owner" ? "Chọn ai được giúp bạn quản lý nhóm và họ được làm những việc gì." : group.name}
        back={{ href: `/groups/${group.id}`, label: group.name }}
      />
      <ManagersPanel groupId={group.id} groupName={group.name} data={data} myUserId={user.userId} suggestions={suggestions} />
    </Box>
  );
}
