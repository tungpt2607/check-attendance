import mongoose, { type Types } from "mongoose";
import { VI_COLLATION, connectDB, isValidId } from "../../lib/db.js";
import { AttendanceRecord } from "../attendance/attendance.model.js";
import { Invite, LinkRequest } from "../invites/invite.model.js";
import { Member, type MemberRecord } from "./member.model.js";

export type MemberDTO = {
  id: string;
  groupId: string;
  name: string;
  code: string;
  linkedUserId: string | null;
};

function toDTO(m: MemberRecord): MemberDTO {
  return {
    id: String(m._id),
    groupId: String(m.groupId),
    name: m.name,
    code: m.code ?? "",
    linkedUserId: m.userId ? String(m.userId) : null,
  };
}

/** Lưu ý: hàm này không kiểm tra quyền, nơi gọi phải kiểm tra quyền sở hữu nhóm trước. */
export async function listMembers(groupId: string): Promise<MemberDTO[]> {
  await connectDB();
  const list = await Member.find({ groupId }).collation(VI_COLLATION).sort({ name: 1 }).lean<MemberRecord[]>();
  return list.map(toDTO);
}

/**
 * Thêm nhiều thành viên một lúc. Mỗi dòng một người, dạng "Tên" hoặc "Mã, Tên"
 * hoặc "Mã<TAB>Tên" (dán từ Excel).
 */
export async function addMembersFromText(groupId: string, text: string): Promise<number> {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|,/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) return { code: parts[0], name: parts.slice(1).join(" ") };
      return { code: undefined, name: parts[0] ?? line };
    });

  if (rows.length === 0) return 0;
  await connectDB();
  const gid = new mongoose.Types.ObjectId(groupId);
  await Member.insertMany(rows.map((r) => ({ groupId: gid, name: r.name, code: r.code, userId: null })));
  return rows.length;
}

/** Tên của nhiều thành viên theo id (không kiểm tra quyền) */
export async function getMemberNames(memberIds: string[]): Promise<Map<string, string>> {
  const ids = memberIds.filter(isValidId);
  if (ids.length === 0) return new Map();
  await connectDB();
  const list = await Member.find({ _id: { $in: ids } }, { name: 1 }).lean<Pick<MemberRecord, "_id" | "name">[]>();
  return new Map(list.map((m) => [String(m._id), m.name]));
}

export async function getMember(memberId: string): Promise<MemberDTO | null> {
  if (!isValidId(memberId)) return null;
  await connectDB();
  const m = await Member.findById(memberId).lean<MemberRecord>();
  return m ? toDTO(m) : null;
}

export async function updateMember(memberId: string, data: { name: string; code: string }) {
  await connectDB();
  await Member.updateOne(
    { _id: memberId },
    // Mã để trống nghĩa là xóa mã ($unset), không phải "giữ nguyên"
    data.code.trim()
      ? { $set: { name: data.name.trim(), code: data.code.trim() } }
      : { $set: { name: data.name.trim() }, $unset: { code: 1 } },
  );
}

export async function deleteMember(memberId: string) {
  await connectDB();
  await AttendanceRecord.deleteMany({ memberId });
  await Invite.deleteMany({ memberId });
  await LinkRequest.deleteMany({ memberId });
  await Member.deleteOne({ _id: memberId });
}
