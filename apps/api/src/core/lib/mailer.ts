// Gửi email: một hàm duy nhất sendEmail(). Đổi dịch vụ chỉ cần đổi biến môi trường, không sửa nơi gọi.
// Hiện dùng SMTP (Gmail + Mật khẩu ứng dụng):
//   SMTP_USER, SMTP_PASS (bắt buộc) · SMTP_HOST (mặc định smtp.gmail.com) · SMTP_PORT (mặc định 465)
//   EMAIL_FROM (mặc định "Điểm danh OPES <SMTP_USER>")
// Chưa cấu hình thì chỉ ghi log, không gửi (web vẫn chạy bình thường).
import { createTransport } from "nodemailer";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

type Transport = ReturnType<typeof createTransport>;
let transport: Transport | null = null;

/** Đã cấu hình gửi email chưa */
export function emailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport(): Transport {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 465);
  transport = createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    // Giữ kết nối để gửi nhiều email liên tiếp (thông báo hệ thống) nhanh hơn
    pool: true,
    maxConnections: 1,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

/** Gửi một email. Trả về true nếu đã gửi; lỗi thì ghi log và trả false (không ném lỗi). */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!emailConfigured()) {
    console.warn(`[email] chưa cấu hình SMTP_USER/SMTP_PASS — bỏ qua email "${msg.subject}"`);
    return false;
  }
  const from = process.env.EMAIL_FROM || `"Điểm danh OPES" <${process.env.SMTP_USER}>`;
  try {
    await getTransport().sendMail({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
    return true;
  } catch (err) {
    console.error(`[email] gửi "${msg.subject}" thất bại`, err);
    return false;
  }
}
