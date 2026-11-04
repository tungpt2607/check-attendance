// Điểm danh bằng khuôn mặt: lưu và so khớp vector đặc trưng.
// Trình duyệt của chủ nhóm tính vector từ camera; máy chủ chỉ so khớp, không bao giờ gửi vector của người khác ra ngoài.
import mongoose from "mongoose";
import { connectDB, isValidId } from "../../lib/db.js";
import type { MemberDTO } from "../members/member.service.js";
import { FaceProfile, type FaceProfileRecord } from "./face.model.js";

/** Model đang dùng ở web (apps/web/public/models/face). Đổi model thì đổi tên này: vector cũ không còn được so. */
export const FACE_MODEL = "face-api/face_recognition_model";

/**
 * Ngưỡng khoảng cách (Euclid) để coi là cùng một người.
 * face-api gợi ý 0.6; dùng 0.5 cho chặt hơn vì kết quả được ghi ngay không cần xác nhận.
 */
export const MATCH_THRESHOLD = 0.5;

/** Số mẫu tối đa lưu cho một thành viên chưa liên kết (thêm mẫu khi chủ nhóm chọn tên thủ công) */
const MAX_MEMBER_SAMPLES = 5;

function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Khuôn mặt dùng để nhận diện từng thành viên: của tài khoản đã liên kết nếu có, không thì của riêng thành viên */
async function loadFaces(members: MemberDTO[]): Promise<Map<string, { from: "account" | "member"; descriptors: number[][] }>> {
  const userIds = members.flatMap((m) => (m.linkedUserId ? [new mongoose.Types.ObjectId(m.linkedUserId)] : []));
  const memberIds = members.map((m) => new mongoose.Types.ObjectId(m.id));
  await connectDB();
  const profiles = await FaceProfile.find({
    model: FACE_MODEL,
    $or: [{ userId: { $in: userIds } }, { memberId: { $in: memberIds } }],
  })
    .select("userId memberId descriptors")
    .lean<FaceProfileRecord[]>();
  const byUser = new Map(profiles.filter((p) => p.userId).map((p) => [String(p.userId), p.descriptors]));
  const byMember = new Map(profiles.filter((p) => p.memberId).map((p) => [String(p.memberId), p.descriptors]));

  const out = new Map<string, { from: "account" | "member"; descriptors: number[][] }>();
  for (const m of members) {
    const account = m.linkedUserId ? byUser.get(m.linkedUserId) : undefined;
    const own = byMember.get(m.id);
    if (account?.length) out.set(m.id, { from: "account", descriptors: account });
    else if (own?.length) out.set(m.id, { from: "member", descriptors: own });
  }
  return out;
}

/** Thành viên có khuôn mặt giống nhất (dưới ngưỡng), hoặc null */
export async function findFaceMatch(members: MemberDTO[], descriptor: number[]): Promise<{ member: MemberDTO; distance: number } | null> {
  const faces = await loadFaces(members);
  let best: { member: MemberDTO; distance: number } | null = null;
  for (const m of members) {
    const face = faces.get(m.id);
    if (!face) continue;
    for (const sample of face.descriptors) {
      const d = distance(sample, descriptor);
      if (!best || d < best.distance) best = { member: m, distance: d };
    }
  }
  return best && best.distance < MATCH_THRESHOLD ? best : null;
}

/** Thành viên này đang có khuôn mặt để nhận diện chưa (của tài khoản hay của riêng thành viên) */
export async function getMemberFaceSource(member: MemberDTO): Promise<"account" | "member" | null> {
  return (await loadFaces([member])).get(member.id)?.from ?? null;
}

/**
 * Lưu khuôn mặt sau khi chủ nhóm chọn tên thủ công:
 * - Thành viên đã liên kết tài khoản: lưu vào tài khoản nếu tài khoản CHƯA có khuôn mặt (có rồi thì giữ nguyên)
 * - Thành viên chưa liên kết: thêm một mẫu cho thành viên (giữ tối đa vài mẫu mới nhất)
 */
export async function saveFaceForMember(member: MemberDTO, descriptor: number[], by: string): Promise<"account" | "member" | null> {
  await connectDB();
  const createdBy = new mongoose.Types.ObjectId(by);
  if (member.linkedUserId) {
    const userId = new mongoose.Types.ObjectId(member.linkedUserId);
    const res = await FaceProfile.updateOne(
      { userId },
      { $setOnInsert: { memberId: null, descriptors: [descriptor], model: FACE_MODEL, createdBy } },
      { upsert: true },
    );
    return res.upsertedCount > 0 ? "account" : null;
  }
  const memberId = new mongoose.Types.ObjectId(member.id);
  // Hồ sơ của model cũ: bỏ đi để thay bằng mẫu mới
  await FaceProfile.deleteOne({ memberId, model: { $ne: FACE_MODEL } });
  await FaceProfile.updateOne(
    { memberId },
    {
      $push: { descriptors: { $each: [descriptor], $slice: -MAX_MEMBER_SAMPLES } },
      $setOnInsert: { userId: null, model: FACE_MODEL, createdBy },
    },
    { upsert: true },
  );
  return "member";
}

/** Khuôn mặt của tài khoản (trang Tài khoản) */
export async function getUserFace(userId: string): Promise<{ updatedAt: Date } | null> {
  if (!isValidId(userId)) return null;
  await connectDB();
  const p = await FaceProfile.findOne({ userId }).select("updatedAt").lean<FaceProfileRecord>();
  return p ? { updatedAt: p.updatedAt } : null;
}

export async function deleteUserFace(userId: string) {
  await connectDB();
  await FaceProfile.deleteOne({ userId });
}

export async function deleteMemberFace(memberId: string) {
  await connectDB();
  await FaceProfile.deleteOne({ memberId });
}
