// Đọc một tài nguyên qua API; không tồn tại hoặc không thuộc quyền (404) thì trả null để trang hiện "không tìm thấy".
import { api, ApiError } from "./api";

export async function apiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
