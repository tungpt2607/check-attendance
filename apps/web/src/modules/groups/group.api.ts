// Đọc dữ liệu nhóm qua backend API (chỉ dùng phía máy chủ).
import { api, ApiError } from "@/lib/api";
import type { AttendanceStatus } from "@/modules/attendance/attendance.statuses";

export type BranchStat = {
  counts: Partial<Record<AttendanceStatus, number>>;
  recorded: number;
  rate: number | null;
  memberCount: number;
  sessionCount: number;
};

export type GroupTreeItem = {
  id: string;
  name: string;
  parentId: string | null;
  memberCount: number;
  inviteActive: boolean;
  children: GroupTreeItem[];
};

export type GroupDetail = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  ancestorIds: string[];
  ancestors: { id: string; name: string }[];
  memberCount: number;
  sessionCount: number;
  pendingRequestCount: number;
  inviteActive: boolean;
  /** Chuyên cần chung của nhóm này và mọi nhóm con bên trong */
  branchStats: BranchStat | null;
  children: { id: string; name: string; stats: BranchStat | null }[];
};

/** Cây các nhóm tôi quản lý */
export async function fetchGroupTree(): Promise<GroupTreeItem[]> {
  const { groups } = await api<{ groups: GroupTreeItem[] }>("/v1/groups");
  return groups;
}

/** Chi tiết nhóm; không tồn tại hoặc không thuộc quyền thì null */
export async function fetchGroup(groupId: string): Promise<GroupDetail | null> {
  try {
    return await api<GroupDetail>(`/v1/groups/${encodeURIComponent(groupId)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
