// Quên mật khẩu: tạo link đặt lại và gửi email (dùng ở API công khai và CMS).
import { renderEmail } from "../../lib/email-templates.js";
import { sendEmail } from "../../lib/mailer.js";
import { webUrl } from "../../lib/share.js";
import { countRecentTokens, createOneTimeToken } from "../tokens/one-time-token.service.js";
import { findUserByEmail } from "../users/user.service.js";

/** Link đặt lại mật khẩu hết hạn sau 30 phút */
export const RESET_TTL_MS = 30 * 60 * 1000;
/** Mỗi tài khoản tối đa 3 lần yêu cầu đặt lại mật khẩu mỗi giờ (giữ hạn mức gửi email) */
const RESET_MAX_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

/** Tạo link đặt lại mật khẩu và gửi email (chạy sau khi đã trả kết quả) */
export async function sendPasswordReset(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  // Tài khoản bị khoá không được đặt lại mật khẩu
  if (!user || user.disabledAt) return false;
  const userId = String(user._id);
  if ((await countRecentTokens(userId, "password_reset", HOUR_MS)) >= RESET_MAX_PER_HOUR) {
    console.warn(`[password_reset] vượt giới hạn ${RESET_MAX_PER_HOUR}/giờ cho ${userId}`);
    return false;
  }
  const token = await createOneTimeToken(userId, "password_reset", RESET_TTL_MS);
  const url = `${webUrl()}/reset-password/${token}`;
  const { html, text } = renderEmail({
    heading: "Đặt lại mật khẩu",
    paragraphs: [
      [{ text: "Xin chào " }, { text: user.name, bold: true }, { text: "," }],
      "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Điểm danh dùng email này. Bấm nút bên dưới để đặt mật khẩu mới.",
    ],
    button: { label: "Đặt lại mật khẩu", url },
    note: "Link chỉ dùng được 1 lần và hết hạn sau 30 phút. Nếu bạn không yêu cầu, cứ bỏ qua email này — mật khẩu của bạn vẫn giữ nguyên.",
  });
  return sendEmail({ to: user.email, subject: "Đặt lại mật khẩu · Điểm danh", html, text });
}

