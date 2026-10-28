// Ký và kiểm tra token phiên. File này không dùng thư viện Node nên chạy được cả trong middleware.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ca_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

export type SessionPayload = {
  userId: string;
  name: string;
};

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Thiếu biến môi trường AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId, name: typeof payload.name === "string" ? payload.name : "" };
  } catch {
    return null;
  }
}
