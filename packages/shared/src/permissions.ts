// Quyền của người quản lý nhóm — nguồn duy nhất cho API (kiểm tra), web/CMS (hiện ô chọn, ẩn nút).
// Chủ nhóm có mọi quyền; mỗi người quản lý có các quyền chủ nhóm chọn, áp dụng cho nhóm đó và mọi nhóm con bên trong.
// Quản lý nào cũng XEM được nhóm (thành viên, buổi, thống kê). Chỉ chủ nhóm: xóa nhóm, thêm/bớt quản lý, chuyển chủ nhóm.
// Thêm quyền mới: thêm vào GROUP_PERMISSIONS + PERMISSION_INFO, rồi gắn vào route ở API (requireGroupAccess).

export const GROUP_PERMISSIONS = ["attendance", "sessions", "members", "links", "subgroups"] as const;
export type GroupPermission = (typeof GROUP_PERMISSIONS)[number];

export const PERMISSION_INFO: Record<GroupPermission, { label: string; description: string }> = {
  attendance: { label: "Điểm danh", description: "Chấm Có mặt/Muộn/Vắng, mở QR tự điểm danh, điểm danh bằng khuôn mặt" },
  sessions: { label: "Buổi điểm danh", description: "Tạo, sửa, xóa buổi điểm danh" },
  members: { label: "Thành viên", description: "Thêm, sửa, xóa thành viên" },
  links: { label: "Liên kết tài khoản", description: "Mời liên kết, link tham gia nhóm, duyệt yêu cầu nhận tên" },
  subgroups: { label: "Nhóm con", description: "Tạo nhóm con, đổi tên nhóm" },
};

export type GroupRole = "owner" | "manager";

/** Quyền của người đang xem đối với một nhóm */
export type GroupAccess = { role: GroupRole; permissions: GroupPermission[] };

export function isGroupPermission(value: unknown): value is GroupPermission {
  return (GROUP_PERMISSIONS as readonly unknown[]).includes(value);
}

/** Có quyền này không (chủ nhóm luôn có) */
export function can(access: GroupAccess | null | undefined, permission: GroupPermission): boolean {
  return !!access && (access.role === "owner" || access.permissions.includes(permission));
}

/** Danh sách quyền gọn, đúng thứ tự, không trùng */
export function normalizePermissions(list: readonly string[]): GroupPermission[] {
  return GROUP_PERMISSIONS.filter((p) => list.includes(p));
}
