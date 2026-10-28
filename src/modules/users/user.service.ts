import { compare, hash } from "bcryptjs";
import { connectDB, isValidId } from "@/lib/db";
import { User, type UserRecord } from "./user.model";

/** Không lấy dữ liệu ảnh (nặng) khi chỉ cần thông tin tài khoản */
const WITHOUT_AVATAR_DATA = "-avatar.data";

export async function findUserByEmail(email: string) {
  await connectDB();
  return User.findOne({ email: email.toLowerCase().trim() }).select(WITHOUT_AVATAR_DATA).lean<UserRecord>();
}

export async function createUser(input: { name: string; email: string; password: string }) {
  await connectDB();
  const passwordHash = await hash(input.password, 10);
  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
  });
  return { id: String(user._id), name: user.name, email: user.email, tokenVersion: user.tokenVersion ?? 0 };
}

export async function verifyPassword(user: Pick<UserRecord, "passwordHash">, password: string) {
  return compare(password, user.passwordHash);
}

export type AccountDTO = {
  id: string;
  name: string;
  email: string;
  tokenVersion: number;
  /** Mốc thời gian ảnh đại diện (dùng làm phiên bản để trình duyệt tải ảnh mới); null = chưa có ảnh */
  avatarVersion: number | null;
};

export async function getAccount(userId: string): Promise<AccountDTO | null> {
  if (!isValidId(userId)) return null;
  await connectDB();
  const u = await User.findById(userId).select(WITHOUT_AVATAR_DATA).lean<UserRecord>();
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    tokenVersion: u.tokenVersion ?? 0,
    avatarVersion: u.avatar?.updatedAt ? new Date(u.avatar.updatedAt).getTime() : null,
  };
}

export async function updateUserName(userId: string, name: string) {
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { name: name.trim() } });
}

export async function setUserAvatar(userId: string, data: Buffer, contentType: string) {
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { avatar: { data, contentType, updatedAt: new Date() } } });
}

export async function removeUserAvatar(userId: string) {
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { avatar: null } });
}

/** Lấy ảnh đại diện để trả về trình duyệt */
export async function getUserAvatar(userId: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!isValidId(userId)) return null;
  await connectDB();
  // Không dùng lean: cần Buffer thật thay vì kiểu Binary của MongoDB
  const u = await User.findById(userId).select("avatar");
  if (!u?.avatar?.data) return null;
  return { data: Buffer.from(u.avatar.data), contentType: u.avatar.contentType };
}

/**
 * Đổi mật khẩu. Trả về phiên bản đăng nhập mới (các phiên cũ hết hiệu lực),
 * hoặc null nếu mật khẩu hiện tại sai.
 */
export async function changePassword(userId: string, current: string, next: string): Promise<number | null> {
  await connectDB();
  const u = await User.findById(userId).select("passwordHash tokenVersion").lean<UserRecord>();
  if (!u || !(await compare(current, u.passwordHash))) return null;
  const passwordHash = await hash(next, 10);
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
    { new: true, projection: { tokenVersion: 1 } },
  ).lean<UserRecord>();
  return updated?.tokenVersion ?? 1;
}
