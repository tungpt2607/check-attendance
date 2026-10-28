import { Types } from "mongoose";
import { connectDB, isValidId } from "@/lib/db";
import { AttendanceRecord } from "@/modules/attendance/attendance.model";
import { Member, type MemberRecord } from "./member.model";

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
  const list = await Member.find({ groupId }).sort({ name: 1 }).lean<MemberRecord[]>();
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
  const gid = new Types.ObjectId(groupId);
  await Member.insertMany(rows.map((r) => ({ groupId: gid, name: r.name, code: r.code, userId: null })));
  return rows.length;
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
    { $set: { name: data.name.trim(), code: data.code.trim() || undefined } },
  );
}

export async function deleteMember(memberId: string) {
  await connectDB();
  await AttendanceRecord.deleteMany({ memberId });
  await Member.deleteOne({ _id: memberId });
}
