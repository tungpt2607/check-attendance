// Gọi backend API (apps/api) từ phía máy chủ của một web Next.js (web người dùng, CMS...).
// Mỗi web tạo một trình gọi riêng bằng createApiClient (tên cookie phiên, trang xử lý phiên hết hạn).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "./api-url";

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

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Object → gửi JSON; FormData → gửi multipart */
  body?: unknown;
  /** Token dùng thay cho cookie (vd. vừa đăng nhập xong, cookie chưa kịp ghi) */
  token?: string | null;
  /** false: không gửi token (API công khai) */
  auth?: boolean;
};

/** Mã lỗi API khi phiên đăng nhập hỏng, đã bị thu hồi (đổi mật khẩu ở thiết bị khác...) hoặc tài khoản bị khoá */
export const DEAD_SESSION_CODES = ["invalid_token", "session_revoked", "account_disabled"];

/**
 * Tạo hàm gọi API cho một web.
 * - cookieName: cookie chứa token phiên
 * - deadSessionPath: trang chuyển tới khi phiên trong cookie hết hiệu lực (xóa cookie rồi về trang đăng nhập)
 */
export function createApiClient({ cookieName, deadSessionPath }: { cookieName: string; deadSessionPath: string }) {
  /** Gọi API, trả về JSON (hoặc null khi 204). Lỗi thì ném ApiError. */
  async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    let cookieToken = false;
    if (opts.auth !== false) {
      const token = opts.token !== undefined ? opts.token : (await cookies()).get(cookieName)?.value;
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

    if (res.status === 204 || res.status === 202) return null as T;
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
      if (res.status === 401 && cookieToken && DEAD_SESSION_CODES.includes(err?.code ?? "")) redirect(deadSessionPath);
      throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
    }
    return data as T;
  }

  /** Đọc một tài nguyên; không tồn tại hoặc không thuộc quyền (404) thì trả null để trang hiện "không tìm thấy" */
  async function apiOrNull<T>(path: string): Promise<T | null> {
    try {
      return await api<T>(path);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  return { api, apiOrNull };
}

/** Dùng trong action: lỗi nghiệp vụ (không tìm thấy, dữ liệu sai...) thì bỏ qua; lỗi máy chủ ném tiếp */
export function ignoreApiError(err: unknown): void {
  if (!(err instanceof ApiError) || err.status >= 500) throw err;
}

/** Mã trên đường dẫn API */
export const enc = encodeURIComponent;
