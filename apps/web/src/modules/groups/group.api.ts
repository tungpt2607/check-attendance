// Đọc dữ liệu nhóm qua backend API (chỉ dùng phía máy chủ).
import { buildGroupTree, type GroupDetail, type GroupListItem, type GroupTreeItem } from "@check-attendance/shared/api";
import { api, apiOrNull, enc } from "@/lib/api";

export type { BranchStat, GroupDetail, GroupTreeItem } from "@check-attendance/shared/api";

/** Cây các nhóm tôi quản lý */
export async function fetchGroupTree(): Promise<GroupTreeItem[]> {
  const { groups } = await api<{ groups: GroupListItem[] }>("/v1/groups");
  return buildGroupTree(groups);
}

/** Chi tiết nhóm; không tồn tại hoặc không thuộc quyền thì null */
export function fetchGroup(groupId: string): Promise<GroupDetail | null> {
  return apiOrNull<GroupDetail>(`/v1/groups/${enc(groupId)}`);
}
