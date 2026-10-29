// Kiểm tra token phiên (token do API cấp, ký bằng AUTH_SECRET) ngay tại web, không gọi API.
// Không dùng thư viện Node nên chạy được cả trong middleware.
import { jwtVerify } from "jose";

export type SessionPayload = {
  userId: string;
  name: string;
  /** Phiên bản đăng nhập lúc tạo phiên; lệch với tài khoản (đã đổi mật khẩu) thì phiên hết hiệu lực */
  tv: number;
};

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Thiếu biến môi trường AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      name: typeof payload.name === "string" ? payload.name : "",
      // Phiên tạo trước khi có tính năng này: coi như phiên bản 0
      tv: typeof payload.tv === "number" ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}
