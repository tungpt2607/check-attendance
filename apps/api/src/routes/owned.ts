// Kiểm tra quyền cho mọi API của nhóm, thành viên, buổi điểm danh.
// - Không phải chủ nhóm/người quản lý: 404 (không tiết lộ dữ liệu có tồn tại hay không)
// - Là người quản lý nhưng thiếu quyền cho thao tác: 403 kèm câu báo
// - need = "owner": chỉ chủ nhóm (xóa nhóm, thêm/bớt quản lý, chuyển chủ nhóm)
import { PERMISSION_INFO, can, type GroupAccess, type GroupPermission } from "@check-attendance/shared/permissions";
import { getAttendanceSession } from "../core/modules/attendance/attendance.service.js";
import { getGroupWithAccess } from "../core/modules/groups/access.service.js";
import { groupToDTO } from "../core/modules/groups/group.service.js";
import { getMember } from "../core/modules/members/member.service.js";
import { fail, notFound } from "../http.js";

export type Need = GroupPermission | "owner" | undefined;

function check(access: GroupAccess, need: Need) {
  if (!need) return;
  if (need === "owner") {
    if (access.role !== "owner") fail(403, "owner_only", "Chỉ chủ nhóm làm được việc này.");
    return;
  }
  if (!can(access, need)) fail(403, "forbidden", `Bạn chưa được chủ nhóm cấp quyền "${PERMISSION_INFO[need].label}".`);
}

/** Nhóm kèm quyền của người dùng (access) */
export async function groupOr404(groupId: string, userId: string, need?: Need) {
  const found = await getGroupWithAccess(groupId, userId);
  if (!found) return notFound("nhóm");
  check(found.access, need);
  return { ...groupToDTO(found.group), access: found.access };
}

export async function memberOr404(memberId: string, userId: string, need?: Need) {
  const m = await getMember(memberId);
  const found = m ? await getGroupWithAccess(m.groupId, userId) : null;
  if (!m || !found) return notFound("thành viên");
  check(found.access, need);
  return { ...m, access: found.access };
}

export async function sessionOr404(sessionId: string, userId: string, need?: Need) {
  const s = await getAttendanceSession(sessionId);
  const found = s ? await getGroupWithAccess(s.groupId, userId) : null;
  if (!s || !found) return notFound("buổi điểm danh");
  check(found.access, need);
  return { ...s, access: found.access };
}
