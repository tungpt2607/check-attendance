"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { requireUser, setSessionCookie } from "@/lib/session";

/** Lỗi API thì trả câu báo lỗi để hiện trong form; lỗi khác ném tiếp */
function apiErrorState(err: unknown): FormState {
  if (err instanceof ApiError) return { error: err.message };
  throw err;
}

export type FormState = { ok?: string; error?: string } | undefined;

export async function updateNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Vui lòng nhập họ tên." };
  if (name.length > 80) return { error: "Họ tên quá dài." };

  try {
    await api("/v1/me", { method: "PATCH", body: { name } });
  } catch (err) {
    return apiErrorState(err);
  }
  revalidatePath("/", "layout");
  return { ok: "Đã lưu họ tên." };
}

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Ảnh đã được cắt và thu nhỏ trên điện thoại (1024px), thường 150–400KB */
const AVATAR_MAX_BYTES = 600 * 1024;

export async function uploadAvatarAction(formData: FormData): Promise<FormState> {
  await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Chưa chọn ảnh." };
  if (!AVATAR_TYPES.includes(file.type)) return { error: "Định dạng ảnh không hỗ trợ." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Ảnh quá lớn." };

  try {
    const fd = new FormData();
    fd.append("avatar", file, "avatar.jpg");
    await api("/v1/me/avatar", { method: "PUT", body: fd });
  } catch (err) {
    return apiErrorState(err);
  }
  revalidatePath("/", "layout");
  return { ok: "Đã cập nhật ảnh đại diện." };
}

export async function removeAvatarAction(): Promise<FormState> {
  await requireUser();
  try {
    await api("/v1/me/avatar", { method: "DELETE" });
  } catch (err) {
    return apiErrorState(err);
  }
  revalidatePath("/", "layout");
  return { ok: "Đã xóa ảnh đại diện." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Vui lòng nhập mật khẩu hiện tại." };
  if (next.length < 6) return { error: "Mật khẩu mới phải có ít nhất 6 ký tự." };
  if (next !== confirm) return { error: "Mật khẩu nhập lại không khớp." };
  if (next === current) return { error: "Mật khẩu mới phải khác mật khẩu hiện tại." };

  try {
    // API trả token mới; các thiết bị khác giữ token cũ nên sẽ bị đăng xuất
    const { token } = await api<{ token: string }>("/v1/me/password", { method: "POST", body: { current, next } });
    await setSessionCookie(token);
  } catch (err) {
    return apiErrorState(err);
  }
  return { ok: "Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất." };
}
