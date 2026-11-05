import Box from "@mui/material/Box";
import { notFound } from "next/navigation";
import type { GroupManagers } from "@check-attendance/shared/api";
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
  const [group, data] = await Promise.all([fetchGroup(groupId), apiOrNull<GroupManagers>(`/v1/groups/${enc(groupId)}/managers`)]);
  if (!group || !data) notFound();

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader
        title="Người quản lý"
        subtitle={data.access.role === "owner" ? "Chọn ai được giúp bạn quản lý nhóm và họ được làm những việc gì." : group.name}
        back={{ href: `/groups/${group.id}`, label: group.name }}
      />
      <ManagersPanel groupId={group.id} groupName={group.name} data={data} myUserId={user.userId} />
    </Box>
  );
}
