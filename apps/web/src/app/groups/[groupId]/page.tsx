// Trang nhóm (chủ nhóm): tiêu đề + 3 tab Điểm danh / Thành viên / Nhóm con.
// Nội dung từng tab nằm trong ./_components.
import { notFound } from "next/navigation";
import type { LinkRequestRow, MemberRow, SessionSummary, ShareLink } from "@check-attendance/shared/api";
import { GroupPageHeader } from "@/components/group-page-header";
import { GroupTabs } from "@/components/group-tabs";
import type { MemberSort } from "@/components/member-sort";
import { apiOrNull, enc } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { fetchGroup } from "@/modules/groups/group.api";
import { GroupBreadcrumbs } from "./_components/group-breadcrumbs";
import { MembersTab } from "./_components/members-tab";
import { SessionsTab } from "./_components/sessions-tab";
import { SubgroupsTab } from "./_components/subgroups-tab";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string }>; searchParams: Promise<{ tab?: string; sort?: string }> };

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const { tab, sort: sortParam } = await searchParams;
  const sort: MemberSort = sortParam === "rate" ? "rate" : "name";
  await requireUser();

  // Gọi song song: thông tin nhóm (nhóm cha, nhóm con kèm thống kê), thành viên (kèm tài khoản liên kết,
  // % chuyên cần), buổi điểm danh, yêu cầu chờ duyệt, link tham gia. Không thuộc quyền thì mọi API đều 404.
  const gid = enc(groupId);
  const [group, membersRes, sessionsRes, requestsRes, inviteRes] = await Promise.all([
    fetchGroup(groupId),
    apiOrNull<{ members: MemberRow[] }>(`/v1/groups/${gid}/members${sort === "rate" ? "?sort=rate" : ""}`),
    apiOrNull<{ sessions: SessionSummary[] }>(`/v1/groups/${gid}/sessions`),
    apiOrNull<{ requests: LinkRequestRow[] }>(`/v1/groups/${gid}/requests`),
    apiOrNull<{ link: ShareLink | null }>(`/v1/groups/${gid}/invite`),
  ]);
  if (!group || !membersRes || !sessionsRes || !requestsRes || !inviteRes) notFound();
  const { members } = membersRes;
  const { sessions } = sessionsRes;
  const { requests } = requestsRes;
  const { link } = inviteRes;
  const { children } = group;

  return (
    <>
      <GroupBreadcrumbs ancestors={group.ancestors} />

      <GroupPageHeader
        key={group.name}
        groupId={group.id}
        groupName={group.name}
        subtitle={`${members.length} thành viên · ${children.length} nhóm con · ${sessions.length} buổi điểm danh`}
        branchRate={children.length > 0 ? (group.branchStats?.rate ?? null) : undefined}
        canDelete={children.length === 0}
        inviteLink={link}
        access={group.access}
      />

      <GroupTabs
        initial={tab}
        tabs={[
          { key: "sessions", label: "Điểm danh", content: <SessionsTab groupId={group.id} memberCount={members.length} sessions={sessions} access={group.access} /> },
          {
            key: "members",
            label: "Thành viên",
            badge: requests.length,
            content: <MembersTab group={group} members={members} requests={requests} sort={sort} access={group.access} />,
          },
          { key: "subgroups", label: "Nhóm con", content: <SubgroupsTab groupId={group.id} subgroups={children} access={group.access} /> },
        ]}
      />
    </>
  );
}
