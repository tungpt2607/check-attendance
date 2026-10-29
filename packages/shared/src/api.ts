// Schema dữ liệu của backend API (zod) — nguồn duy nhất cho:
//  - API: kiểm tra dữ liệu gửi lên + sinh tài liệu /docs (apps/api, @hono/zod-openapi)
//  - Web, CMS, app: kiểu dữ liệu nhận về (z.infer)
// Ngày giờ luôn là chuỗi ISO 8601; ngày điểm danh gửi lên dạng YYYY-MM-DD.
import { z } from "zod";
import { STATUS_VALUES } from "@check-attendance/shared/statuses";

// ---------- Dùng chung ----------

export const Id = z.string().regex(/^[a-f0-9]{24}$/i, "Mã không hợp lệ.").describe("Mã (ObjectId 24 ký tự hex)");
export const IsoDateTime = z.string().describe("Thời điểm, ISO 8601");
export const DateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ (định dạng YYYY-MM-DD).").describe("YYYY-MM-DD");

export const StatusSchema = z.enum(STATUS_VALUES).describe("present = Có mặt, late = Muộn, absent = Vắng");
export const StatusCountsSchema = z.partialRecord(StatusSchema, z.number().int());

export const ErrorSchema = z.object({
  error: z.object({
    code: z.string().describe("Mã lỗi máy đọc được, vd. not_found"),
    message: z.string().describe("Câu báo lỗi tiếng Việt để hiện cho người dùng"),
  }),
});

/** Tài khoản đã liên kết với thành viên (chủ nhóm thấy email) */
export const PublicAccountSchema = z.object({
  id: Id,
  name: z.string(),
  email: z.string(),
  avatarVersion: z.number().nullable().describe("Phiên bản ảnh đại diện; null = chưa có ảnh"),
});

export const ShareLinkSchema = z.object({
  url: z.string(),
  qrDataUrl: z.string().describe("Ảnh mã QR (data URL PNG)"),
  expiresAt: IsoDateTime.nullable(),
});

/** Tỷ lệ chuyên cần = (có mặt + muộn) / số buổi đã có kết quả */
export const RateSchema = z.object({
  counts: StatusCountsSchema,
  recorded: z.number().int(),
  rate: z.number().nullable().describe("0..1; null = chưa có kết quả"),
});

export const BranchStatSchema = RateSchema.extend({
  memberCount: z.number().int(),
  sessionCount: z.number().int(),
});

// ---------- Tài khoản ----------

export const UserSchema = z.object({
  id: Id,
  name: z.string(),
  email: z.string(),
  avatarVersion: z.number().nullable(),
  role: z.enum(["user", "admin"]),
});

export const AuthResultSchema = z.object({
  token: z.string().describe("Gửi kèm header Authorization: Bearer <token>"),
  user: UserSchema,
});

const Password = z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự.");
const PersonName = z.string().trim().min(1, "Vui lòng nhập họ tên.").max(80, "Họ tên quá dài.");

export const RegisterInput = z.object({
  name: PersonName,
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ.")),
  password: Password,
});
export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().min(1, "Vui lòng nhập email và mật khẩu."),
  password: z.string().min(1, "Vui lòng nhập email và mật khẩu."),
});
export const NameInput = z.object({ name: PersonName });
export const PasswordInput = z.object({
  current: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
  next: Password,
});
export const AvatarVersionSchema = z.object({ avatarVersion: z.number().nullable() });

// ---------- Nhóm ----------

const GroupName = z.string().trim().min(1, "Vui lòng nhập tên nhóm.").max(120, "Tên nhóm quá dài.");

export const GroupSchema = z.object({
  id: Id,
  name: z.string(),
  description: z.string(),
  parentId: Id.nullable(),
  ancestorIds: z.array(Id),
});

/** Một nhóm trong danh sách phẳng; dựng cây bằng buildGroupTree() */
export const GroupListItemSchema = z.object({
  id: Id,
  name: z.string(),
  parentId: Id.nullable(),
  memberCount: z.number().int(),
  inviteActive: z.boolean().describe("Đang bật link tham gia nhóm"),
});
export const GroupListSchema = z.object({ groups: z.array(GroupListItemSchema) });

export const GroupDetailSchema = GroupSchema.extend({
  ancestors: z.array(z.object({ id: Id, name: z.string() })),
  memberCount: z.number().int(),
  sessionCount: z.number().int(),
  pendingRequestCount: z.number().int(),
  inviteActive: z.boolean(),
  branchStats: BranchStatSchema.nullable().describe("Chuyên cần chung của nhóm này và mọi nhóm con bên trong"),
  children: z.array(z.object({ id: Id, name: z.string(), stats: BranchStatSchema.nullable() })),
});

export const CreateGroupInput = z.object({ name: GroupName, parentId: Id.nullable().optional() });
export const RenameGroupInput = z.object({ name: GroupName });

export const InviteLinkSchema = z.object({ link: ShareLinkSchema.nullable() });
export const NewLinkSchema = z.object({ link: ShareLinkSchema });

export const LinkRequestSchema = z.object({
  id: Id,
  account: PublicAccountSchema.nullable(),
  memberId: Id,
  memberName: z.string().nullable(),
  createdAt: IsoDateTime,
});
export const LinkRequestListSchema = z.object({ requests: z.array(LinkRequestSchema) });

// ---------- Thành viên ----------

export const MemberRowSchema = z.object({
  id: Id,
  name: z.string(),
  code: z.string(),
  linkedAccount: PublicAccountSchema.nullable(),
  stats: RateSchema,
});
export const MemberListSchema = z.object({ members: z.array(MemberRowSchema) });

export const AddMembersInput = z
  .object({
    text: z.string().optional().describe("Mỗi dòng một người: \"Tên\" hoặc \"Mã, Tên\" (dán từ Excel được)"),
    members: z.array(z.object({ name: z.string(), code: z.string().optional() })).optional(),
  })
  .describe("Gửi text HOẶC members");
export const AddedSchema = z.object({ added: z.number().int() });

export const MemberSchema = z.object({ id: Id, groupId: Id, name: z.string(), code: z.string(), linkedUserId: Id.nullable() });

export const MemberHistoryItemSchema = z.object({
  sessionId: Id,
  title: z.string(),
  date: IsoDateTime,
  status: StatusSchema.nullable(),
  note: z.string(),
  source: z.enum(["manual", "self"]).nullable(),
  checkedInAt: IsoDateTime.nullable().describe("Giờ tự điểm danh bằng QR"),
});

export const MemberDetailSchema = z.object({
  id: Id,
  groupId: Id,
  groupName: z.string(),
  name: z.string(),
  code: z.string(),
  linkedAccount: PublicAccountSchema.nullable(),
  stats: RateSchema,
  history: z.array(MemberHistoryItemSchema),
});

export const UpdateMemberInput = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(120, "Họ tên quá dài."),
  code: z.string().trim().max(50, "Mã số quá dài.").optional().describe("Bỏ trống để xóa mã"),
});

// ---------- Buổi điểm danh ----------

export const SessionSchema = z.object({
  id: Id,
  groupId: Id,
  title: z.string(),
  date: IsoDateTime,
  method: z.string(),
  selfCheckInOpen: z.boolean(),
});
export const SessionSummarySchema = SessionSchema.extend({ counts: StatusCountsSchema });
export const SessionListSchema = z.object({ sessions: z.array(SessionSummarySchema) });

export const SessionRowSchema = z.object({
  memberId: Id,
  name: z.string(),
  code: z.string(),
  linked: z.boolean(),
  status: StatusSchema.nullable().describe("null = chưa có kết quả"),
  note: z.string(),
  source: z.enum(["manual", "self"]).nullable(),
  checkedInAt: IsoDateTime.nullable(),
});
export const SessionDetailSchema = SessionSchema.extend({
  groupName: z.string(),
  defaultStatus: StatusSchema,
  rows: z.array(SessionRowSchema),
});

export const CreateSessionInput = z.object({
  title: z.string().trim().max(120, "Tên buổi quá dài.").optional(),
  date: DateInput,
});
export const UpdateSessionInput = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên buổi.").max(120, "Tên buổi quá dài.").optional(),
  date: DateInput.optional(),
});
export const SaveRecordsInput = z.object({
  records: z
    .array(z.object({ memberId: Id, status: StatusSchema, note: z.string().max(500).optional() }))
    .describe("Chỉ gửi dòng thay đổi; ghi chú rỗng = xóa ghi chú"),
});
export const SavedSchema = z.object({ saved: z.number().int() });

export const QrStateSchema = z.discriminatedUnion("open", [
  z.object({
    open: z.literal(true),
    url: z.string(),
    qrDataUrl: z.string(),
    checkedIn: z.number().int(),
    total: z.number().int(),
    windowEndsAt: z.number().describe("Lúc mã hiện tại đổi (ms, giờ máy chủ)"),
    serverNow: z.number().describe("Giờ máy chủ (ms), để bù lệch đồng hồ"),
  }),
  z.object({ open: z.literal(false) }),
]);

// ---------- Tự điểm danh ----------

export const CheckInInfoSchema = z.object({
  sessionId: Id,
  title: z.string(),
  date: IsoDateTime,
  groupName: z.string(),
  members: z.array(
    z.object({
      id: Id,
      name: z.string(),
      code: z.string(),
      linked: z.boolean().describe("Đã liên kết tài khoản: phải đăng nhập đúng tài khoản đó"),
      isMe: z.boolean(),
      checkedIn: z.boolean(),
    }),
  ),
});
export const CheckInInput = z.object({ token: z.string().min(1), memberId: Id });
export const CheckInResultSchema = z.object({ ok: z.literal(true), memberId: Id, name: z.string() });

// ---------- Liên kết tài khoản ----------

export const InviteInfoSchema = z.object({
  memberId: Id,
  memberName: z.string(),
  memberCode: z.string(),
  groupName: z.string(),
  expiresAt: IsoDateTime.nullable(),
  memberAlreadyLinked: z.boolean(),
  myMemberId: Id.nullable().describe("Tên tôi đang liên kết trong nhóm này (nếu có)"),
  myMemberName: z.string().nullable(),
});
export const AcceptedSchema = z.object({ memberId: Id });

export const JoinInfoSchema = z.object({
  groupName: z.string(),
  myMemberId: Id.nullable(),
  myMemberName: z.string().nullable(),
  pendingRequest: z.object({ memberId: Id, memberName: z.string().nullable() }).nullable(),
  members: z.array(z.object({ id: Id, name: z.string(), code: z.string() })),
});
export const JoinRequestInput = z.object({ memberId: Id });
export const RequestStatusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });

// ---------- Nhóm tôi tham gia ----------

export const MembershipSchema = z.object({ memberId: Id, memberName: z.string(), groupId: Id, groupName: z.string() });
export const MembershipListSchema = z.object({ memberships: z.array(MembershipSchema) });

export const MyMembershipSchema = z.object({
  memberName: z.string(),
  groupName: z.string(),
  items: z.array(
    z.object({ sessionId: Id, title: z.string(), date: IsoDateTime, status: StatusSchema.nullable(), note: z.string() }),
  ),
  counts: StatusCountsSchema,
  recorded: z.number().int(),
  rate: z.number().nullable(),
  roster: z.array(
    z.object({
      id: Id,
      name: z.string(),
      code: z.string(),
      linked: z.object({ userId: Id, name: z.string(), avatarVersion: z.number().nullable() }).nullable(),
    }),
  ),
});

// ---------- Kiểu dữ liệu (cho web, CMS, app) ----------

export type StatusCounts = z.infer<typeof StatusCountsSchema>;
export type PublicAccount = z.infer<typeof PublicAccountSchema>;
export type ShareLink = z.infer<typeof ShareLinkSchema>;
export type Rate = z.infer<typeof RateSchema>;
export type BranchStat = z.infer<typeof BranchStatSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthResult = z.infer<typeof AuthResultSchema>;
export type GroupListItem = z.infer<typeof GroupListItemSchema>;
export type GroupDetail = z.infer<typeof GroupDetailSchema>;
export type LinkRequestRow = z.infer<typeof LinkRequestSchema>;
export type MemberRow = z.infer<typeof MemberRowSchema>;
export type MemberDetail = z.infer<typeof MemberDetailSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type SessionDetail = z.infer<typeof SessionDetailSchema>;
export type QrState = z.infer<typeof QrStateSchema>;
export type CheckInInfo = z.infer<typeof CheckInInfoSchema>;
export type InviteInfo = z.infer<typeof InviteInfoSchema>;
export type JoinInfo = z.infer<typeof JoinInfoSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type MyMembership = z.infer<typeof MyMembershipSchema>;

/** Cây nhóm dựng từ danh sách phẳng (giữ thứ tự của danh sách) */
export type GroupTreeItem = GroupListItem & { children: GroupTreeItem[] };

export function buildGroupTree(list: GroupListItem[]): GroupTreeItem[] {
  const nodes = new Map<string, GroupTreeItem>(list.map((g) => [g.id, { ...g, children: [] }]));
  const roots: GroupTreeItem[] = [];
  for (const g of list) {
    const node = nodes.get(g.id)!;
    const parent = g.parentId ? nodes.get(g.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
