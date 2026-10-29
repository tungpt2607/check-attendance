// Gọi backend API (apps/api) từ phía máy chủ của web.
// Token gửi kèm chính là cookie phiên đăng nhập của web (cùng một JWT, ký bằng AUTH_SECRET).
// Phiên hết hiệu lực (đổi mật khẩu ở thiết bị khác, tài khoản bị khoá): chuyển sang /logout.
import { createApiClient } from "@check-attendance/ui/api-client";
import { SESSION_COOKIE } from "./auth-token";

export { ApiError, enc, ignoreApiError } from "@check-attendance/ui/api-client";

export const { api, apiOrNull } = createApiClient({ cookieName: SESSION_COOKIE, deadSessionPath: "/logout" });
