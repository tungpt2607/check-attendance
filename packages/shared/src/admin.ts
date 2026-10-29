// Schema dữ liệu của API quản trị (/v1/admin/*) — dùng cho API (kiểm tra + tài liệu) và CMS (kiểu dữ liệu).
// Chỉ tài khoản quản trị (role = admin hoặc email trong ADMIN_EMAILS) gọi được.
import { z } from "zod";
import { BranchStatSchema, Id, IsoDateTime, PublicAccountSchema, StatusCountsSchema } from "@check-attendance/shared/api";

// ---------- Nhật ký quản trị ----------

/** Các thao tác được ghi nhật ký. Thêm thao tác mới: thêm vào đây + nhãn trong AUDIT_ACTION_LABELS */
export const AUDIT_ACTIONS = [
  "user.disable",
  "user.enable",
  "user.role_change",
  "user.revoke_sessions",
  "user.password_reset_email",
  "group.delete",
  "announcement.send",
  "email.test",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.disable": "Khoá tài khoản",
  "user.enable": "Mở khoá tài khoản",
  "user.role_change": "Đổi quyền",
  "user.revoke_sessions": "Đăng xuất mọi thiết bị",
  "user.password_reset_email": "Gửi email đặt lại mật khẩu",
  "group.delete": "Xoá nhóm",
  "announcement.send": "Gửi thông báo hệ thống",
  "email.test": "Gửi email thử",
};

/** Đối tượng của thao tác */
export const AUDIT_TARGETS = ["user", "group", "announcement", "system"] as const;
export type AuditTarget = (typeof AUDIT_TARGETS)[number];

// ---------- Dùng chung ----------

export const PageQuery = z.object({
  q: z.string().trim().max(100).optional().describe("Tìm theo tên / email"),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const paged = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() });

export const OkSchema = z.object({ ok: z.literal(true) });

// ---------- Tổng quan ----------

export const AdminStatsSchema = z.object({
  totals: z.object({
    users: z.number().int(),
    disabledUsers: z.number().int(),
    groups: z.number().int(),
    members: z.number().int(),
    linkedMembers: z.number().int().describe("Thành viên đã liên kết tài khoản"),
    sessions: z.number().int(),
    selfCheckins: z.number().int().describe("Lượt tự điểm danh bằng QR"),
  }),
  /** 30 ngày gần nhất (giờ Việt Nam), cũ → mới */
  daily: z.array(
    z.object({
      date: z.string().describe("YYYY-MM-DD"),
      newUsers: z.number().int(),
      sessions: z.number().int(),
      selfCheckins: z.number().int(),
    }),
  ),
  recentUsers: z.array(PublicAccountSchema.extend({ createdAt: IsoDateTime })),
});

// ---------- Tài khoản ----------

export const RoleSchema = z.enum(["user", "admin"]);

export const AdminUserRowSchema = PublicAccountSchema.extend({
  role: RoleSchema.describe("Quyền thực tế"),
  /** env = quản trị cố định do ADMIN_EMAILS (không bỏ quyền được trong CMS) */
  roleSource: z.enum(["db", "env"]),
  disabled: z.boolean(),
  createdAt: IsoDateTime,
  ownedGroupCount: z.number().int(),
  membershipCount: z.number().int(),
});
export const AdminUserListSchema = paged(AdminUserRowSchema);

export const AdminUserDetailSchema = AdminUserRowSchema.extend({
  disabledAt: IsoDateTime.nullable(),
  ownedGroups: z.array(z.object({ id: Id, name: z.string(), parentId: Id.nullable(), memberCount: z.number().int() })),
  memberships: z.array(z.object({ memberId: Id, memberName: z.string(), groupId: Id, groupName: z.string() })),
});

export const RoleInput = z.object({ role: RoleSchema });

// ---------- Nhóm ----------

export const AdminGroupRowSchema = z.object({
  id: Id,
  name: z.string(),
  parentId: Id.nullable(),
  /** Đường dẫn nhóm cha: "Gốc / Cha" (rỗng nếu là nhóm gốc) */
  path: z.string(),
  owner: PublicAccountSchema.nullable(),
  memberCount: z.number().int(),
  sessionCount: z.number().int(),
  childCount: z.number().int(),
  createdAt: IsoDateTime,
});
export const AdminGroupListSchema = paged(AdminGroupRowSchema);

export const AdminGroupDetailSchema = AdminGroupRowSchema.extend({
  ancestors: z.array(z.object({ id: Id, name: z.string() })),
  children: z.array(z.object({ id: Id, name: z.string(), memberCount: z.number().int() })),
  /** Số nhóm con các cấp bên trong (xoá nhóm là xoá cả những nhóm này) */
  descendantCount: z.number().int(),
  branchStats: BranchStatSchema.nullable(),
  members: z.array(
    z.object({
      id: Id,
      name: z.string(),
      code: z.string(),
      linkedAccount: PublicAccountSchema.nullable(),
      rate: z.number().nullable().describe("Tỷ lệ chuyên cần 0–1; null = chưa có kết quả"),
    }),
  ),
  sessions: z.array(
    z.object({ id: Id, title: z.string(), date: IsoDateTime, counts: StatusCountsSchema, total: z.number().int() }),
  ),
});

export const DeletedGroupSchema = z.object({
  groups: z.number().int(),
  members: z.number().int(),
  sessions: z.number().int(),
});

// ---------- Thông báo hệ thống ----------

export const AnnouncementInput = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề.").max(120, "Tiêu đề quá dài."),
  message: z.string().trim().max(1000, "Nội dung quá dài.").optional(),
  href: z
    .string()
    .trim()
    .max(300)
    .regex(/^\/(?!\/)/, "Đường dẫn phải là trang trong web, bắt đầu bằng /")
    .optional()
    .or(z.literal("")),
  email: z.boolean().optional().describe("Gửi kèm email (tới người còn bật nhận email)"),
});

export const AnnouncementAudienceSchema = z.object({
  users: z.number().int().describe("Số tài khoản sẽ nhận (trừ tài khoản bị khoá)"),
  emailRecipients: z.number().int().describe("Số người còn bật nhận email"),
  emailLimit: z.number().int().describe("Tối đa số email một lần gửi"),
  emailAvailable: z.boolean(),
});

export const AnnouncementRowSchema = z.object({
  id: Id,
  title: z.string(),
  message: z.string(),
  href: z.string(),
  email: z.boolean(),
  recipientCount: z.number().int(),
  emailCount: z.number().int(),
  actor: PublicAccountSchema.nullable(),
  createdAt: IsoDateTime,
});
export const AnnouncementListSchema = paged(AnnouncementRowSchema);

// ---------- Hệ thống ----------

export const SystemInfoSchema = z.object({
  features: z.object({ email: z.boolean() }),
  emailSender: z.string().nullable().describe("Địa chỉ gửi email (SMTP_USER)"),
  adminEmails: z.array(z.string()).describe("Quản trị cố định (ADMIN_EMAILS)"),
  version: z.string().nullable().describe("Commit đang chạy"),
  webUrl: z.string(),
});

export const TestEmailInput = z.object({
  to: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ.")).optional(),
});
export const TestEmailResultSchema = z.object({ sent: z.boolean(), to: z.string() });

export const AuditRowSchema = z.object({
  id: Id,
  action: z.enum(AUDIT_ACTIONS),
  actor: PublicAccountSchema.nullable(),
  targetKind: z.enum(AUDIT_TARGETS).nullable(),
  targetId: z.string().nullable(),
  /** Tên đối tượng lúc thao tác (đối tượng có thể đã bị xoá) */
  targetLabel: z.string(),
  detail: z.string().describe("Mô tả thêm, vd. quyền mới, số nhóm đã xoá"),
  createdAt: IsoDateTime,
});
export const AuditListSchema = paged(AuditRowSchema);
export const AuditQuery = PageQuery.extend({ action: z.enum(AUDIT_ACTIONS).optional() });

// ---------- Kiểu dữ liệu ----------

export type AdminStats = z.infer<typeof AdminStatsSchema>;
export type AdminUserRow = z.infer<typeof AdminUserRowSchema>;
export type AdminUserList = z.infer<typeof AdminUserListSchema>;
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;
export type AdminGroupRow = z.infer<typeof AdminGroupRowSchema>;
export type AdminGroupList = z.infer<typeof AdminGroupListSchema>;
export type AdminGroupDetail = z.infer<typeof AdminGroupDetailSchema>;
export type DeletedGroup = z.infer<typeof DeletedGroupSchema>;
export type AnnouncementAudience = z.infer<typeof AnnouncementAudienceSchema>;
export type AnnouncementRow = z.infer<typeof AnnouncementRowSchema>;
export type AnnouncementList = z.infer<typeof AnnouncementListSchema>;
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
export type AuditRow = z.infer<typeof AuditRowSchema>;
export type AuditList = z.infer<typeof AuditListSchema>;
