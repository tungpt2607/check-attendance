// Kiểm tra quyền sở hữu: chỉ chủ nhóm mới xem/sửa được nhóm, thành viên, buổi điểm danh của nhóm đó.
// Không thuộc quyền thì trả 404 (không tiết lộ dữ liệu có tồn tại hay không).
import { getAttendanceSession } from "../core/modules/attendance/attendance.service.js";
import { getOwnedGroup } from "../core/modules/groups/group.service.js";
import { getMember } from "../core/modules/members/member.service.js";
import { notFound } from "../http.js";

export async function ownedGroupOr404(groupId: string, userId: string) {
  const g = await getOwnedGroup(groupId, userId);
  if (!g) return notFound("nhóm");
  return g;
}

export async function ownedMemberOr404(memberId: string, userId: string) {
  const m = await getMember(memberId);
  if (!m || !(await getOwnedGroup(m.groupId, userId))) return notFound("thành viên");
  return m;
}

export async function ownedSessionOr404(sessionId: string, userId: string) {
  const s = await getAttendanceSession(sessionId);
  if (!s || !(await getOwnedGroup(s.groupId, userId))) return notFound("buổi điểm danh");
  return s;
}
