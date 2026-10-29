// /v1/sessions: buổi điểm danh, kết quả, mở/đóng tự điểm danh QR
// /v1/checkin: thành viên tự điểm danh bằng QR (công khai)
import { createRoute, z } from "@hono/zod-openapi";
import {
  CheckInInfoSchema,
  CheckInInput,
  CheckInResultSchema,
  QrStateSchema,
  SavedSchema,
  SaveRecordsInput,
  SessionDetailSchema,
  SessionSchema,
  UpdateSessionInput,
} from "@check-attendance/shared/api";
import { parseDateInput } from "@check-attendance/shared/format";
import QRCode from "qrcode";
import { requireUser } from "../auth.js";
import { createCheckInToken, currentWindowEndsAt, encodeShortCode, verifyCheckInToken } from "../core/lib/checkin-token.js";
import { webUrl } from "../core/lib/share.js";
import {
  closeSelfCheckIn,
  countCheckedIn,
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSession,
  getCheckInSecret,
  getSessionRecords,
  openSelfCheckIn,
  recordSelfCheckIn,
  saveSessionRecords,
  updateAttendanceSession,
  type AttendanceSessionDTO,
} from "../core/modules/attendance/attendance.service.js";
import { DEFAULT_STATUS, isAttended } from "../core/modules/attendance/attendance.statuses.js";
import { getGroupName } from "../core/modules/groups/group.service.js";
import { getMember, listMembers } from "../core/modules/members/member.service.js";
import { AUTH, createApp, fail, IdParam, iso, jsonBody, NO_CONTENT, ok, OPTIONAL_AUTH, SessionIdParam } from "../http.js";
import { ownedSessionOr404 } from "./owned.js";

const TAG = ["Điểm danh"];
const CHECKIN_TAG = ["Tự điểm danh"];

/** Buổi điểm danh → dữ liệu trả về (ngày dạng chuỗi ISO) */
export function sessionOut(s: AttendanceSessionDTO) {
  return { id: s.id, groupId: s.groupId, title: s.title, date: iso(s.date), method: s.method, selfCheckInOpen: s.selfCheckInOpen };
}

/** Tạo buổi trong nhóm đã kiểm tra quyền (dùng cho POST /groups/:id/sessions) */
export async function createSessionIn(groupId: string, userId: string, input: { title?: string; date: string }) {
  const date = parseDateInput(input.date);
  if (!date) fail(422, "validation", "Ngày không hợp lệ (định dạng YYYY-MM-DD).");
  return createAttendanceSession({ groupId, title: input.title || "Buổi điểm danh", date: date!, createdBy: userId });
}

/** Buổi đang mở tự điểm danh và mã QR còn hạn; không thì báo 410 */
async function openSessionOr410(sessionId: string, token: string | undefined) {
  const session = await getAttendanceSession(sessionId);
  const secret = session ? await getCheckInSecret(sessionId) : null;
  if (!session || !secret) return fail(410, "closed", "Buổi điểm danh đã đóng.");
  if (!verifyCheckInToken(sessionId, secret, token)) fail(410, "expired", "Mã QR đã hết hạn. Hãy quét lại mã trên màn hình.");
  return session;
}

export const sessions = createApp()
  .openapi(
    createRoute({
      method: "get",
      path: "/sessions/{id}",
      tags: TAG,
      summary: "Buổi điểm danh kèm kết quả từng thành viên",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(SessionDetailSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      const [members, records, groupName] = await Promise.all([
        listMembers(session.groupId),
        getSessionRecords(session.id),
        getGroupName(session.groupId),
      ]);
      return c.json(
        {
          ...sessionOut(session),
          groupName: groupName ?? "",
          defaultStatus: DEFAULT_STATUS,
          rows: members.map((m) => {
            const r = records.get(m.id);
            return {
              memberId: m.id,
              name: m.name,
              code: m.code,
              linked: !!m.linkedUserId,
              status: r?.status ?? null,
              note: r?.note ?? "",
              source: r?.source ?? null,
              checkedInAt: r?.source === "self" ? iso(r.checkedInAt) : null,
            };
          }),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "patch",
      path: "/sessions/{id}",
      tags: TAG,
      summary: "Sửa tên, ngày",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(UpdateSessionInput) },
      responses: { 200: ok(SessionSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      const body = c.req.valid("json");
      const title = body.title || session.title;
      const date = body.date === undefined ? session.date : parseDateInput(body.date);
      if (!date) fail(422, "validation", "Ngày không hợp lệ (định dạng YYYY-MM-DD).");
      await updateAttendanceSession(session.id, { title, date: date! });
      return c.json(sessionOut({ ...session, title, date: date! }), 200);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/sessions/{id}",
      tags: TAG,
      summary: "Xóa buổi cùng kết quả",
      security: AUTH,
      request: { params: IdParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      await deleteAttendanceSession(session.id);
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "put",
      path: "/sessions/{id}/records",
      tags: TAG,
      summary: "Lưu kết quả (chỉ gửi dòng thay đổi để không ghi đè người vừa tự điểm danh)",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(SaveRecordsInput) },
      responses: { 200: ok(SavedSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      const memberIds = new Set((await listMembers(session.groupId)).map((m) => m.id));
      const entries = c.req.valid("json").records.map((r) => {
        if (!memberIds.has(r.memberId)) fail(422, "validation", `Thành viên ${r.memberId} không thuộc nhóm.`);
        return { memberId: r.memberId, status: r.status, note: (r.note ?? "").trim() };
      });
      await saveSessionRecords(session.id, user.userId, entries);
      return c.json({ saved: entries.length }, 200);
    },
  )

  // ---------- Tự điểm danh bằng QR (phía chủ nhóm) ----------

  .openapi(
    createRoute({
      method: "post",
      path: "/sessions/{id}/self-checkin/open",
      tags: TAG,
      summary: "Mở tự điểm danh bằng QR (ghi sẵn Vắng cho người chưa có kết quả)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(SessionSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      const members = await listMembers(session.groupId);
      await openSelfCheckIn(session.id, members.map((m) => m.id), user.userId);
      return c.json(sessionOut({ ...session, selfCheckInOpen: true }), 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/sessions/{id}/self-checkin/close",
      tags: TAG,
      summary: "Đóng tự điểm danh",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(SessionSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      await closeSelfCheckIn(session.id);
      return c.json(sessionOut({ ...session, selfCheckInOpen: false }), 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/sessions/{id}/qr",
      tags: TAG,
      summary: "Mã QR hiện tại (đổi mỗi 30 giây) và số người đã điểm danh",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(QrStateSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const session = await ownedSessionOr404(c.req.valid("param").id, user.userId);
      const secret = await getCheckInSecret(session.id);
      if (!secret) return c.json({ open: false as const }, 200);
      const url = `${webUrl()}/c/${encodeShortCode(session.id, createCheckInToken(session.id, secret))}`;
      const [qrDataUrl, checkedIn, members] = await Promise.all([
        QRCode.toDataURL(url, { margin: 2, width: 640, errorCorrectionLevel: "L" }),
        countCheckedIn(session.id),
        listMembers(session.groupId),
      ]);
      return c.json(
        {
          open: true as const,
          url,
          qrDataUrl,
          checkedIn,
          total: members.length,
          windowEndsAt: currentWindowEndsAt(),
          serverNow: Date.now(),
        },
        200,
      );
    },
  )

  // ---------- Tự điểm danh (phía thành viên, công khai) ----------

  .openapi(
    createRoute({
      method: "get",
      path: "/checkin/{sessionId}",
      tags: CHECKIN_TAG,
      summary: "Danh sách tên để chọn sau khi quét QR (410 nếu buổi đã đóng hoặc mã hết hạn)",
      security: OPTIONAL_AUTH,
      request: { params: SessionIdParam, query: z.object({ t: z.string().optional().describe("Token trong mã QR") }) },
      responses: { 200: ok(CheckInInfoSchema) },
    }),
    async (c) => {
      const session = await openSessionOr410(c.req.valid("param").sessionId, c.req.valid("query").t);
      const viewer = c.get("user");
      const [members, records, groupName] = await Promise.all([
        listMembers(session.groupId),
        getSessionRecords(session.id),
        getGroupName(session.groupId),
      ]);
      return c.json(
        {
          sessionId: session.id,
          title: session.title,
          date: iso(session.date),
          groupName: groupName ?? "",
          members: members.map((m) => ({
            id: m.id,
            name: m.name,
            code: m.code,
            linked: !!m.linkedUserId,
            isMe: !!viewer && m.linkedUserId === viewer.userId,
            checkedIn: isAttended(records.get(m.id)?.status),
          })),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/checkin/{sessionId}",
      tags: CHECKIN_TAG,
      summary: "Tự điểm danh (tên đã liên kết phải đăng nhập đúng tài khoản; giới hạn 1 người/điện thoại do client giữ)",
      security: OPTIONAL_AUTH,
      request: { params: SessionIdParam, ...jsonBody(CheckInInput) },
      responses: { 200: ok(CheckInResultSchema) },
    }),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const { token, memberId } = c.req.valid("json");
      const session = await openSessionOr410(sessionId, token);
      const member = await getMember(memberId);
      if (!member || member.groupId !== session.groupId) fail(404, "not_found", "Không tìm thấy tên này trong nhóm.");
      const m = member!;
      if (m.linkedUserId) {
        const viewer = c.get("user");
        if (!viewer) fail(401, "login_required", `${m.name} đã liên kết tài khoản. Hãy đăng nhập để điểm danh.`);
        if (viewer!.userId !== m.linkedUserId) {
          fail(403, "wrong_account", `${m.name} đã liên kết với một tài khoản khác. Bạn chỉ điểm danh được cho chính mình.`);
        }
      }
      if ((await recordSelfCheckIn(sessionId, memberId)) === "already") {
        fail(409, "already", `${m.name} đã được điểm danh rồi. Nếu không phải bạn, hãy báo người quản lý.`);
      }
      return c.json({ ok: true as const, memberId, name: m.name }, 200);
    },
  );
