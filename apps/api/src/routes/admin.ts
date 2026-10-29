// /v1/admin/*: API cho trang quản trị (CMS). Mọi API đều cần tài khoản quản trị (requireAdmin).
// Mọi thao tác thay đổi dữ liệu đều ghi nhật ký (logAudit).
import { createRoute, z } from "@hono/zod-openapi";
import {
  AdminGroupDetailSchema,
  AdminGroupListSchema,
  AdminStatsSchema,
  AdminUserDetailSchema,
  AdminUserListSchema,
  AnnouncementAudienceSchema,
  AnnouncementInput,
  AnnouncementListSchema,
  AnnouncementRowSchema,
  AuditListSchema,
  AuditQuery,
  DeletedGroupSchema,
  OkSchema,
  PageQuery,
  RoleInput,
  SystemInfoSchema,
  TestEmailInput,
  TestEmailResultSchema,
} from "@check-attendance/shared/admin";
import { requireAdmin } from "../auth.js";
import { renderEmail } from "../core/lib/email-templates.js";
import { emailConfigured, sendEmail } from "../core/lib/mailer.js";
import { adminEmails, roleSource } from "../core/lib/roles.js";
import { webUrl } from "../core/lib/share.js";
import {
  countEmailRecipients,
  getActiveUserIds,
  getAdminStats,
  getGroupAdminBase,
  getUserAdmin,
  listGroupsAdmin,
  listUsersAdmin,
} from "../core/modules/admin/admin.service.js";
import { Announcement, type AnnouncementRecord } from "../core/modules/announcements/announcement.model.js";
import { listSessionsWithCounts } from "../core/modules/attendance/attendance.service.js";
import { getBranchStats, getMemberRates } from "../core/modules/attendance/stats.service.js";
import { listAudit, logAudit } from "../core/modules/audit/audit.service.js";
import { sendPasswordReset } from "../core/modules/auth/password-reset.service.js";
import { deleteGroupTree } from "../core/modules/groups/group.service.js";
import { listMembers } from "../core/modules/members/member.service.js";
import { notify } from "../core/modules/notifications/notification.service.js";
import { getAccount, getAccountsByIds, revokeUserSessions, setUserDisabled, setUserRole } from "../core/modules/users/user.service.js";
import { AUTH, createApp, fail, IdParam, iso, jsonBody, notFound, ok } from "../http.js";

const TAG_STATS = ["Quản trị · Tổng quan"];
const TAG_USERS = ["Quản trị · Tài khoản"];
const TAG_GROUPS = ["Quản trị · Nhóm"];
const TAG_ANN = ["Quản trị · Thông báo hệ thống"];
const TAG_SYS = ["Quản trị · Hệ thống"];

const DEFAULT_PAGE_SIZE = 20;
/** Tối đa số email gửi một lần (hạn mức Gmail ~500/ngày; mỗi lần gửi chạy trong một lượt máy chủ) */
const EMAIL_BATCH_LIMIT = 100;

function paging(q: { page?: number; pageSize?: number }) {
  return { page: q.page ?? 1, pageSize: q.pageSize ?? DEFAULT_PAGE_SIZE };
}

/** Tài khoản mà quản trị viên định thao tác (không cho tự thao tác lên chính mình) */
async function targetUser(id: string, adminId: string) {
  const acc = await getAccount(id);
  if (!acc) return notFound("tài khoản");
  if (acc.id === adminId) fail(409, "self_action", "Không thể thao tác lên chính tài khoản của bạn.");
  return acc;
}

function announcementOut(a: AnnouncementRecord, actors: Map<string, { id: string; name: string; email: string; avatarVersion: number | null }>) {
  return {
    id: String(a._id),
    title: a.title,
    message: a.message,
    href: a.href,
    email: a.email,
    recipientCount: a.recipientCount,
    emailCount: a.emailCount,
    actor: a.actorId ? (actors.get(String(a.actorId)) ?? null) : null,
    createdAt: iso(a.createdAt),
  };
}

export const admin = createApp()
  // ---------- Tổng quan ----------
  .openapi(
    createRoute({
      method: "get",
      path: "/admin/stats",
      tags: TAG_STATS,
      summary: "Số liệu tổng quan + hoạt động 30 ngày",
      security: AUTH,
      responses: { 200: ok(AdminStatsSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      return c.json(await getAdminStats(), 200);
    },
  )

  // ---------- Tài khoản ----------
  .openapi(
    createRoute({
      method: "get",
      path: "/admin/users",
      tags: TAG_USERS,
      summary: "Danh sách tài khoản (mới nhất trước), tìm theo tên/email",
      security: AUTH,
      request: { query: PageQuery },
      responses: { 200: ok(AdminUserListSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      const q = c.req.valid("query");
      const { page, pageSize } = paging(q);
      const { items, total } = await listUsersAdmin({ q: q.q, page, pageSize });
      return c.json({ items, total, page, pageSize }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/admin/users/{id}",
      tags: TAG_USERS,
      summary: "Chi tiết tài khoản: nhóm quản lý, nhóm tham gia",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(AdminUserDetailSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      const detail = await getUserAdmin(c.req.valid("param").id);
      if (!detail) return notFound("tài khoản");
      return c.json(detail, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/admin/users/{id}/disable",
      tags: TAG_USERS,
      summary: "Khoá tài khoản (đăng xuất ngay; nhóm của người đó giữ nguyên)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(OkSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const acc = await targetUser(c.req.valid("param").id, me.userId);
      if (roleSource(acc.email) === "env") fail(409, "fixed_admin", "Không thể khoá quản trị viên cố định (ADMIN_EMAILS).");
      await setUserDisabled(acc.id, true);
      await logAudit({ actorId: me.userId, action: "user.disable", target: { kind: "user", id: acc.id, label: `${acc.name} (${acc.email})` } });
      return c.json({ ok: true as const }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/admin/users/{id}/enable",
      tags: TAG_USERS,
      summary: "Mở khoá tài khoản",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(OkSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const acc = await targetUser(c.req.valid("param").id, me.userId);
      await setUserDisabled(acc.id, false);
      await logAudit({ actorId: me.userId, action: "user.enable", target: { kind: "user", id: acc.id, label: `${acc.name} (${acc.email})` } });
      return c.json({ ok: true as const }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "put",
      path: "/admin/users/{id}/role",
      tags: TAG_USERS,
      summary: "Cấp / bỏ quyền quản trị",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(RoleInput) },
      responses: { 200: ok(OkSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const acc = await targetUser(c.req.valid("param").id, me.userId);
      const { role } = c.req.valid("json");
      if (role === "user" && roleSource(acc.email) === "env") {
        fail(409, "fixed_admin", "Đây là quản trị viên cố định (ADMIN_EMAILS), không bỏ quyền được trong CMS.");
      }
      await setUserRole(acc.id, role);
      await logAudit({
        actorId: me.userId,
        action: "user.role_change",
        target: { kind: "user", id: acc.id, label: `${acc.name} (${acc.email})` },
        detail: role === "admin" ? "Cấp quyền quản trị" : "Bỏ quyền quản trị",
      });
      return c.json({ ok: true as const }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/admin/users/{id}/revoke-sessions",
      tags: TAG_USERS,
      summary: "Đăng xuất tài khoản khỏi mọi thiết bị",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(OkSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const acc = await targetUser(c.req.valid("param").id, me.userId);
      await revokeUserSessions(acc.id);
      await logAudit({ actorId: me.userId, action: "user.revoke_sessions", target: { kind: "user", id: acc.id, label: `${acc.name} (${acc.email})` } });
      return c.json({ ok: true as const }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/admin/users/{id}/password-reset",
      tags: TAG_USERS,
      summary: "Gửi email đặt lại mật khẩu cho tài khoản (tối đa 3 lần/giờ/tài khoản)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(z.object({ sent: z.boolean() })) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      if (!emailConfigured()) fail(503, "email_unavailable", "Chức năng gửi email chưa được bật.");
      const acc = await getAccount(c.req.valid("param").id);
      if (!acc) return notFound("tài khoản");
      if (acc.disabled) fail(409, "account_disabled", "Tài khoản đang bị khoá, hãy mở khoá trước.");
      const sent = await sendPasswordReset(acc.email);
      if (sent) {
        await logAudit({ actorId: me.userId, action: "user.password_reset_email", target: { kind: "user", id: acc.id, label: `${acc.name} (${acc.email})` } });
      }
      return c.json({ sent }, 200);
    },
  )

  // ---------- Nhóm ----------
  .openapi(
    createRoute({
      method: "get",
      path: "/admin/groups",
      tags: TAG_GROUPS,
      summary: "Danh sách mọi nhóm (mới nhất trước), tìm theo tên nhóm hoặc chủ nhóm",
      security: AUTH,
      request: { query: PageQuery },
      responses: { 200: ok(AdminGroupListSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      const q = c.req.valid("query");
      const { page, pageSize } = paging(q);
      const { items, total } = await listGroupsAdmin({ q: q.q, page, pageSize });
      return c.json({ items, total, page, pageSize }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/admin/groups/{id}",
      tags: TAG_GROUPS,
      summary: "Chi tiết nhóm: chủ nhóm, thành viên kèm chuyên cần, các buổi",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(AdminGroupDetailSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      const base = await getGroupAdminBase(c.req.valid("param").id);
      if (!base) return notFound("nhóm");
      const [members, rates, sessions, branch] = await Promise.all([
        listMembers(base.id),
        getMemberRates(base.id),
        listSessionsWithCounts(base.id),
        getBranchStats([base.id]),
      ]);
      const accounts = await getAccountsByIds(members.flatMap((m) => (m.linkedUserId ? [m.linkedUserId] : [])));
      return c.json(
        {
          ...base,
          branchStats: branch.get(base.id) ?? null,
          members: members.map((m) => ({
            id: m.id,
            name: m.name,
            code: m.code,
            linkedAccount: m.linkedUserId ? (accounts.get(m.linkedUserId) ?? null) : null,
            rate: rates.get(m.id)?.rate ?? null,
          })),
          sessions: sessions.map((s) => ({
            id: s.id,
            title: s.title,
            date: iso(s.date),
            counts: s.counts,
            total: Object.values(s.counts).reduce((a, b) => a + (b ?? 0), 0),
          })),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/admin/groups/{id}",
      tags: TAG_GROUPS,
      summary: "Xoá nhóm cùng mọi nhóm con, thành viên, buổi điểm danh bên trong (không khôi phục được)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(DeletedGroupSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const base = await getGroupAdminBase(c.req.valid("param").id);
      if (!base) return notFound("nhóm");
      const result = await deleteGroupTree(base.id);
      if (!result) return notFound("nhóm");
      await logAudit({
        actorId: me.userId,
        action: "group.delete",
        target: { kind: "group", id: base.id, label: base.path ? `${base.path} / ${base.name}` : base.name },
        detail: `Chủ nhóm: ${base.owner?.email ?? "?"} · ${result.groups} nhóm, ${result.members} thành viên, ${result.sessions} buổi`,
      });
      return c.json(result, 200);
    },
  )

  // ---------- Thông báo hệ thống ----------
  .openapi(
    createRoute({
      method: "get",
      path: "/admin/announcements/audience",
      tags: TAG_ANN,
      summary: "Số người sẽ nhận thông báo hệ thống / email",
      security: AUTH,
      responses: { 200: ok(AnnouncementAudienceSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const [ids, emailRecipients] = await Promise.all([getActiveUserIds(), countEmailRecipients()]);
      return c.json(
        {
          users: ids.filter((id) => id !== me.userId).length,
          emailRecipients,
          emailLimit: EMAIL_BATCH_LIMIT,
          emailAvailable: emailConfigured(),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/admin/announcements",
      tags: TAG_ANN,
      summary: "Lịch sử thông báo hệ thống đã gửi",
      security: AUTH,
      request: { query: PageQuery },
      responses: { 200: ok(AnnouncementListSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      const { page, pageSize } = paging(c.req.valid("query"));
      const [list, total] = await Promise.all([
        Announcement.find().sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<AnnouncementRecord[]>(),
        Announcement.countDocuments(),
      ]);
      const actors = await getAccountsByIds(list.flatMap((a) => (a.actorId ? [String(a.actorId)] : [])));
      return c.json({ items: list.map((a) => announcementOut(a, actors)), total, page, pageSize }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/admin/announcements",
      tags: TAG_ANN,
      summary: "Gửi thông báo hệ thống tới mọi tài khoản đang hoạt động (hiện trong chuông, tuỳ chọn kèm email)",
      security: AUTH,
      request: jsonBody(AnnouncementInput),
      responses: { 201: ok(AnnouncementRowSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      const input = c.req.valid("json");
      const recipients = (await getActiveUserIds()).filter((id) => id !== me.userId);
      let emailCount = 0;
      if (input.email) {
        if (!emailConfigured()) fail(503, "email_unavailable", "Chức năng gửi email chưa được bật.");
        emailCount = await countEmailRecipients();
        if (emailCount > EMAIL_BATCH_LIMIT) {
          fail(422, "too_many_emails", `Có ${emailCount} người nhận email, vượt giới hạn ${EMAIL_BATCH_LIMIT} email một lần. Hãy gửi không kèm email.`);
        }
      }
      const created = await Announcement.create({
        actorId: me.userId,
        title: input.title,
        message: input.message ?? "",
        href: input.href ?? "",
        email: !!input.email,
        recipientCount: recipients.length,
        emailCount,
      });
      await notify({
        type: "system.announcement",
        recipients,
        actorId: me.userId,
        subject: null,
        data: { title: input.title, message: input.message || undefined, href: input.href || undefined },
        email: !!input.email,
      });
      await logAudit({
        actorId: me.userId,
        action: "announcement.send",
        target: { kind: "announcement", id: String(created._id), label: input.title },
        detail: `${recipients.length} người nhận${input.email ? `, kèm email (${emailCount})` : ""}`,
      });
      const actors = await getAccountsByIds([me.userId]);
      return c.json(announcementOut(created.toObject(), actors), 201);
    },
  )

  // ---------- Hệ thống ----------
  .openapi(
    createRoute({
      method: "get",
      path: "/admin/system",
      tags: TAG_SYS,
      summary: "Trạng thái hệ thống: tính năng đang bật, địa chỉ gửi email, phiên bản",
      security: AUTH,
      responses: { 200: ok(SystemInfoSchema) },
    }),
    (c) => {
      requireAdmin(c);
      return c.json(
        {
          features: { email: emailConfigured() },
          emailSender: process.env.SMTP_USER || null,
          adminEmails: [...adminEmails()],
          version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
          webUrl: webUrl(),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/admin/system/test-email",
      tags: TAG_SYS,
      summary: "Gửi email thử (mặc định tới email của quản trị viên đang đăng nhập)",
      security: AUTH,
      request: jsonBody(TestEmailInput),
      responses: { 200: ok(TestEmailResultSchema) },
    }),
    async (c) => {
      const me = requireAdmin(c);
      if (!emailConfigured()) fail(503, "email_unavailable", "Chức năng gửi email chưa được bật.");
      const to = c.req.valid("json").to || me.email;
      const { html, text } = renderEmail({
        heading: "Email thử từ trang quản trị",
        paragraphs: ["Nếu bạn đọc được email này, chức năng gửi email của Điểm danh đang hoạt động bình thường."],
        button: { label: "Mở Điểm danh", url: webUrl() },
      });
      const sent = await sendEmail({ to, subject: "Email thử · Điểm danh", html, text });
      await logAudit({ actorId: me.userId, action: "email.test", target: { kind: "system", label: to }, detail: sent ? "Đã gửi" : "Gửi thất bại" });
      return c.json({ sent, to }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/admin/audit",
      tags: TAG_SYS,
      summary: "Nhật ký thao tác quản trị (mới nhất trước)",
      security: AUTH,
      request: { query: AuditQuery },
      responses: { 200: ok(AuditListSchema) },
    }),
    async (c) => {
      requireAdmin(c);
      const q = c.req.valid("query");
      const { page, pageSize } = paging(q);
      const { items, total } = await listAudit({ action: q.action, page, pageSize });
      const actors = await getAccountsByIds(items.flatMap((a) => (a.actorId ? [String(a.actorId)] : [])));
      return c.json(
        {
          items: items.map((a) => ({
            id: String(a._id),
            action: a.action,
            actor: a.actorId ? (actors.get(String(a.actorId)) ?? null) : null,
            targetKind: a.targetKind,
            targetId: a.targetId,
            targetLabel: a.targetLabel,
            detail: a.detail,
            createdAt: iso(a.createdAt),
          })),
          total,
          page,
          pageSize,
        },
        200,
      );
    },
  );
