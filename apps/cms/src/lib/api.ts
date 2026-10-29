// Gọi backend API từ phía máy chủ của CMS. Phiên hết hiệu lực (đổi mật khẩu, bị khoá...) → /logout.
import { createApiClient } from "@check-attendance/ui/api-client";
import { SESSION_COOKIE } from "./auth-token";

export { ApiError, enc, ignoreApiError } from "@check-attendance/ui/api-client";

export const { api, apiOrNull } = createApiClient({ cookieName: SESSION_COOKIE, deadSessionPath: "/logout" });
