// Cấu hình các loại thông báo — nguồn duy nhất cho API, web, CMS, app.
// Thêm loại mới: thêm tên vào NOTIFICATION_TYPES + một mục trong NOTIFICATION_CONFIG,
// rồi ở API gọi notify({ type, ... }) tại chỗ xảy ra sự việc.

export const NOTIFICATION_TYPES = [
  /** Có người xin nhận tên trong nhóm (qua link tham gia) → người quản lý nhóm */
  "link_request.created",
  /** Yêu cầu nhận tên được duyệt → người xin */
  "link_request.approved",
  /** Yêu cầu nhận tên bị từ chối → người xin */
  "link_request.rejected",
  /** Quản trị viên gửi thông báo tới mọi người (CMS) */
  "system.announcement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Loại đối tượng mà thông báo nói tới (để tự cập nhật khi đối tượng được xử lý) */
export const NOTIFICATION_SUBJECTS = ["link_request"] as const;
export type NotificationSubjectKind = (typeof NOTIFICATION_SUBJECTS)[number];

/** Kết quả xử lý đối tượng (thông báo cần thao tác sẽ hiện kết quả thay cho nút). closed = đối tượng bị xóa (xóa thành viên, xóa nhóm) */
export const NOTIFICATION_RESOLUTIONS = ["approved", "rejected", "cancelled", "closed"] as const;
export type NotificationResolution = (typeof NOTIFICATION_RESOLUTIONS)[number];

export const RESOLUTION_LABELS: Record<NotificationResolution, string> = {
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  cancelled: "Người gửi đã hủy",
  closed: "Không còn hiệu lực",
};

/** Nội dung chụp lại lúc tạo thông báo (tên có thể bị đổi/xóa về sau) */
export type NotificationData = {
  groupName?: string;
  memberId?: string;
  memberName?: string;
  /** Thông báo hệ thống: tiêu đề, nội dung, đường dẫn trong web (tùy chọn) */
  title?: string;
  message?: string;
  href?: string;
};

/** Thông tin tối thiểu để dựng câu chữ và đường dẫn của một thông báo */
export type NotificationLike = {
  type: NotificationType;
  groupId: string | null;
  actor: { name: string } | null;
  data: NotificationData;
};

/** Một đoạn chữ; bold = in đậm */
export type TextPart = { text: string; bold?: boolean };

/** Biểu tượng (mỗi nơi hiển thị tự đổi tên này ra hình của mình) */
export type NotificationIcon = "person_add" | "check" | "close" | "campaign";

/** Thao tác ngay trên thông báo (khi đối tượng chưa được xử lý) */
export type NotificationActions = "approve_reject";

export type NotificationConfig = {
  icon: NotificationIcon;
  /** Màu biểu tượng: chủ đạo / thành công / lỗi */
  tone: "primary" | "success" | "error";
  text: (n: NotificationLike) => TextPart[];
  /** Trang mở khi bấm thông báo; null = không mở trang nào */
  href: (n: NotificationLike) => string | null;
  actions?: NotificationActions;
  /** Có gửi thêm email không (người nhận tắt "Nhận email thông báo" thì không gửi) */
  email?: { subject: (n: NotificationLike) => string };
};

const b = (text: string | undefined, fallback: string): TextPart => ({ text: text || fallback, bold: true });
const t = (text: string): TextPart => ({ text });

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  "link_request.created": {
    icon: "person_add",
    tone: "primary",
    text: (n) => [b(n.actor?.name, "Một tài khoản"), t(" xin nhận tên "), b(n.data.memberName, "(đã xóa)"), t(" trong nhóm "), b(n.data.groupName, "(đã xóa)")],
    href: (n) => (n.groupId ? `/groups/${n.groupId}?tab=members` : null),
    actions: "approve_reject",
    email: { subject: (n) => `Yêu cầu nhận tên mới · ${n.data.groupName || "nhóm của bạn"}` },
  },
  "link_request.approved": {
    icon: "check",
    tone: "success",
    text: (n) => [t("Bạn đã được duyệt là "), b(n.data.memberName, "(đã xóa)"), t(" trong nhóm "), b(n.data.groupName, "(đã xóa)")],
    href: (n) => (n.data.memberId ? `/me/${n.data.memberId}` : null),
  },
  "link_request.rejected": {
    icon: "close",
    tone: "error",
    text: (n) => [t("Yêu cầu nhận tên "), b(n.data.memberName, "(đã xóa)"), t(" trong nhóm "), b(n.data.groupName, "(đã xóa)"), t(" không được duyệt")],
    href: () => null,
  },
  "system.announcement": {
    icon: "campaign",
    tone: "primary",
    text: (n) => [b(n.data.title, "Thông báo"), t(n.data.message ? `: ${n.data.message}` : "")],
    href: (n) => (n.data.href && n.data.href.startsWith("/") ? n.data.href : null),
    // Gửi email hay không do người gửi chọn mỗi lần (notify({ email }))
    email: { subject: (n) => n.data.title || "Thông báo từ Điểm danh" },
  },
};

/** Câu thông báo dạng chữ thường (dùng cho email, thông báo đẩy sau này) */
export function notificationPlainText(n: NotificationLike): string {
  return NOTIFICATION_CONFIG[n.type].text(n).map((p) => p.text).join("");
}
