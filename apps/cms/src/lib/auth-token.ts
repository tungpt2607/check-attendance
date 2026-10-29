// Cookie phiên của CMS (khác tên với web người dùng). Kiểm tra token dùng chung ở @check-attendance/ui/session-token.
export { verifySession, type SessionPayload } from "@check-attendance/ui/session-token";

export const SESSION_COOKIE = "ca_admin_session";
/** Phiên quản trị ngắn hơn web người dùng: 7 ngày */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
