"use server";

import { revalidatePath } from "next/cache";
import { createSession, requireUser } from "@/lib/session";
import { changePassword, removeUserAvatar, setUserAvatar, updateUserName } from "./user.service";

export type FormState = { ok?: string; error?: string } | undefined;

export async function updateNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Vui lòng nhập họ tên." };
  if (name.length > 80) return { error: "Họ tên quá dài." };

  await updateUserName(user.userId, name);
  revalidatePath("/", "layout");
  return { ok: "Đã lưu họ tên." };
}

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Ảnh đã được cắt và thu nhỏ trên điện thoại (1024px), thường 150–400KB */
const AVATAR_MAX_BYTES = 600 * 1024;

export async function uploadAvatarAction(formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Chưa chọn ảnh." };
  if (!AVATAR_TYPES.includes(file.type)) return { error: "Định dạng ảnh không hỗ trợ." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Ảnh quá lớn." };

  await setUserAvatar(user.userId, Buffer.from(await file.arrayBuffer()), file.type);
  revalidatePath("/", "layout");
  return { ok: "Đã cập nhật ảnh đại diện." };
}

export async function removeAvatarAction(): Promise<FormState> {
  const user = await requireUser();
  await removeUserAvatar(user.userId);
  revalidatePath("/", "layout");
  return { ok: "Đã xóa ảnh đại diện." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Vui lòng nhập mật khẩu hiện tại." };
  if (next.length < 6) return { error: "Mật khẩu mới phải có ít nhất 6 ký tự." };
  if (next !== confirm) return { error: "Mật khẩu nhập lại không khớp." };
  if (next === current) return { error: "Mật khẩu mới phải khác mật khẩu hiện tại." };

  const tv = await changePassword(user.userId, current, next);
  if (tv === null) return { error: "Mật khẩu hiện tại không đúng." };

  // Thiết bị đang dùng nhận phiên mới; các thiết bị khác giữ phiên cũ nên sẽ bị đăng xuất.
  await createSession({ userId: user.userId, name: user.name, tv });
  return { ok: "Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất." };
}
