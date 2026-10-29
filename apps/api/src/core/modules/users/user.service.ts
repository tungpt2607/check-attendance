import { compare, hash } from "bcryptjs";
import { connectDB, isValidId } from "../../lib/db.js";
import { User, type UserRecord } from "./user.model.js";

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
  role: "user" | "admin";
  /** Mốc thời gian ảnh đại diện (dùng làm phiên bản để trình duyệt tải ảnh mới); null = chưa có ảnh */
  avatarVersion: number | null;
  /** Bị quản trị viên khoá */
  disabled: boolean;
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
    role: u.role === "admin" ? "admin" : "user",
    avatarVersion: u.avatar?.updatedAt ? new Date(u.avatar.updatedAt).getTime() : null,
    disabled: !!u.disabledAt,
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

export type PublicAccount = { id: string; name: string; email: string; avatarVersion: number | null };

export async function getAccountsByIds(ids: string[]): Promise<Map<string, PublicAccount>> {
  const valid = [...new Set(ids)].filter((id) => isValidId(id));
  if (valid.length === 0) return new Map();
  await connectDB();
  const list = await User.find({ _id: { $in: valid } }).select(WITHOUT_AVATAR_DATA).lean<UserRecord[]>();
  return new Map(
    list.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        name: u.name,
        email: u.email,
        avatarVersion: u.avatar?.updatedAt ? new Date(u.avatar.updatedAt).getTime() : null,
      },
    ]),
  );
}

/** Đặt mật khẩu mới (quên mật khẩu): mọi phiên đăng nhập cũ hết hiệu lực */
export async function resetPassword(userId: string, password: string): Promise<boolean> {
  await connectDB();
  const passwordHash = await hash(password, 10);
  const res = await User.updateOne({ _id: userId }, { $set: { passwordHash }, $inc: { tokenVersion: 1 } });
  return res.matchedCount === 1;
}

// ---------- Cài đặt cá nhân ----------

export type Preferences = { notifications: { email: boolean } };

function toPreferences(u: Pick<UserRecord, "notificationPrefs"> | null): Preferences {
  return { notifications: { email: u?.notificationPrefs?.email !== false } };
}

export async function getPreferences(userId: string): Promise<Preferences> {
  await connectDB();
  const u = await User.findById(userId).select("notificationPrefs").lean<UserRecord>();
  return toPreferences(u);
}

export async function updatePreferences(userId: string, patch: { notifications?: { email?: boolean } }): Promise<Preferences> {
  await connectDB();
  const set: Record<string, unknown> = {};
  if (patch.notifications?.email !== undefined) set["notificationPrefs.email"] = patch.notifications.email;
  if (Object.keys(set).length > 0) await User.updateOne({ _id: userId }, { $set: set });
  return getPreferences(userId);
}

/** Người nhận email thông báo: bỏ những ai đã tắt "Nhận email thông báo" */
export async function getEmailRecipients(ids: string[]): Promise<{ id: string; name: string; email: string }[]> {
  const valid = [...new Set(ids)].filter((id) => isValidId(id));
  if (valid.length === 0) return [];
  await connectDB();
  const list = await User.find({ _id: { $in: valid } }).select("name email notificationPrefs").lean<UserRecord[]>();
  return list
    .filter((u) => toPreferences(u).notifications.email)
    .map((u) => ({ id: String(u._id), name: u.name, email: u.email }));
}

// ---------- Quản trị ----------

/** Khoá / mở khoá tài khoản. Khoá thì mọi phiên đăng nhập hết hiệu lực ngay (tăng tokenVersion). */
export async function setUserDisabled(userId: string, disabled: boolean): Promise<boolean> {
  await connectDB();
  const res = await User.updateOne(
    { _id: userId },
    disabled ? { $set: { disabledAt: new Date() }, $inc: { tokenVersion: 1 } } : { $set: { disabledAt: null } },
  );
  return res.matchedCount === 1;
}

export async function setUserRole(userId: string, role: "user" | "admin"): Promise<boolean> {
  await connectDB();
  const res = await User.updateOne({ _id: userId }, { $set: { role } });
  return res.matchedCount === 1;
}

/** Đăng xuất mọi thiết bị: mọi token cũ hết hiệu lực */
export async function revokeUserSessions(userId: string): Promise<boolean> {
  await connectDB();
  const res = await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  return res.matchedCount === 1;
}
