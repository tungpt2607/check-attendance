// Gọi backend API (apps/api) từ phía máy chủ của web.
// Token gửi kèm chính là cookie phiên đăng nhập của web (cùng một JWT, ký bằng AUTH_SECRET).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "./api-url";
import { SESSION_COOKIE } from "./auth-token";

/** Lỗi API trả về: status HTTP, mã lỗi máy đọc được, câu báo lỗi tiếng Việt để hiện cho người dùng */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Object → gửi JSON; FormData → gửi multipart */
  body?: unknown;
  /** Token dùng thay cho cookie (vd. vừa đăng nhập xong, cookie chưa kịp ghi) */
  token?: string | null;
  /** false: không gửi token (API công khai) */
  auth?: boolean;
};

/** Mã lỗi API khi phiên đăng nhập hỏng hoặc đã bị thu hồi (đổi mật khẩu ở thiết bị khác...) */
const DEAD_SESSION = ["invalid_token", "session_revoked"];

/**
 * Gọi API, trả về JSON (hoặc null khi 204). Lỗi thì ném ApiError.
 * Phiên đăng nhập trong cookie đã hết hiệu lực: chuyển sang /logout (xóa cookie rồi về trang đăng nhập).
 */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let cookieToken = false;
  if (opts.auth !== false) {
    const token = opts.token !== undefined ? opts.token : (await cookies()).get(SESSION_COOKIE)?.value;
    cookieToken = opts.token === undefined && !!token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method ?? "GET", headers, body, cache: "no-store" });
  } catch {
    throw new ApiError(503, "api_unreachable", "Không kết nối được máy chủ. Vui lòng thử lại.");
  }

  if (res.status === 204) return null as T;
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    if (res.status === 401 && cookieToken && DEAD_SESSION.includes(err?.code ?? "")) redirect("/logout");
    throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
  }
  return data as T;
}

/** Đọc một tài nguyên; không tồn tại hoặc không thuộc quyền (404) thì trả null để trang hiện "không tìm thấy" */
export async function apiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Dùng trong action: lỗi nghiệp vụ (không tìm thấy, dữ liệu sai...) thì bỏ qua; lỗi máy chủ ném tiếp */
export function ignoreApiError(err: unknown): void {
  if (!(err instanceof ApiError) || err.status >= 500) throw err;
}

/** Mã trên đường dẫn API */
export const enc = encodeURIComponent;
