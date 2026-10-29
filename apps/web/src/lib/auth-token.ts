// Cookie phiên của web người dùng. Kiểm tra token dùng chung ở @check-attendance/ui/session-token.
export { verifySession, type SessionPayload } from "@check-attendance/ui/session-token";

export const SESSION_COOKIE = "ca_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày
