// /v1/sessions: buổi điểm danh, kết quả, mở/đóng tự điểm danh QR
// /v1/checkin: thành viên tự điểm danh bằng QR (công khai)
import { Hono } from "hono";
import { toDataURL } from "qrcode";
import { requireUser, type AppEnv } from "../auth.js";
import { createCheckInToken, currentWindowEndsAt, encodeShortCode, verifyCheckInToken } from "../core/lib/checkin-token.js";
import { isValidId } from "../core/lib/db.js";
import { parseDateInput } from "../core/lib/format.js";
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
} from "../core/modules/attendance/attendance.service.js";
import { DEFAULT_STATUS, isAttendanceStatus } from "../core/modules/attendance/attendance.statuses.js";
import { getGroupName } from "../core/modules/groups/group.service.js";
import { getMember, listMembers } from "../core/modules/members/member.service.js";
import { fail, idParam, readJson, str } from "../http.js";
import { ownedSessionOr404 } from "./owned.js";

/** Dùng chung cho POST /groups/:id/sessions (nhóm đã được kiểm tra quyền) */
export async function createSessionFromBody(groupId: string, userId: string, body: Record<string, unknown>) {
  const date = parseDateInput(str(body, "date"));
  if (!date) fail(422, "validation", "Ngày không hợp lệ (định dạng YYYY-MM-DD).");
  const title = str(body, "title").slice(0, 120) || "Buổi điểm danh";
  return createAttendanceSession({ groupId, title, date: date!, createdBy: userId });
}

export const sessions = new Hono<AppEnv>()
  /** Buổi điểm danh kèm danh sách thành viên và kết quả từng người (chưa có kết quả thì status = null) */
  .get("/sessions/:id", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    const [members, records] = await Promise.all([listMembers(session.groupId), getSessionRecords(session.id)]);
    return c.json({
      ...session,
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
          checkedInAt: r?.source === "self" ? r.checkedInAt : null,
        };
      }),
    });
  })

  /** Sửa tên/ngày: { "title": "...", "date": "YYYY-MM-DD" } */
  .patch("/sessions/:id", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    const body = await readJson(c);
    const title = str(body, "title") || session.title;
    const date = body.date === undefined ? session.date : parseDateInput(str(body, "date"));
    if (!date) fail(422, "validation", "Ngày không hợp lệ (định dạng YYYY-MM-DD).");
    if (title.length > 120) fail(422, "validation", "Tên buổi quá dài.");
    await updateAttendanceSession(session.id, { title, date: date! });
    return c.json({ ...session, title, date });
  })

  .delete("/sessions/:id", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    await deleteAttendanceSession(session.id);
    return c.body(null, 204);
  })

  /**
   * Lưu kết quả: { "records": [{ "memberId", "status": "present|late|absent", "note"?: "" }] }.
   * Chỉ gửi những dòng thực sự thay đổi, để không ghi đè người vừa tự điểm danh bằng QR.
   * Ghi chú rỗng nghĩa là xóa ghi chú.
   */
  .put("/sessions/:id/records", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    const body = await readJson(c);
    if (!Array.isArray(body.records)) fail(422, "validation", "Thiếu danh sách records.");
    const memberIds = new Set((await listMembers(session.groupId)).map((m) => m.id));
    const entries = (body.records as unknown[]).map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const memberId = typeof r.memberId === "string" ? r.memberId : "";
      if (!memberIds.has(memberId)) fail(422, "validation", `Thành viên ${memberId || "(trống)"} không thuộc nhóm.`);
      if (!isAttendanceStatus(r.status)) fail(422, "validation", "Trạng thái phải là present, late hoặc absent.");
      const note = typeof r.note === "string" ? r.note.trim().slice(0, 500) : "";
      return { memberId, status: r.status as "present" | "late" | "absent", note };
    });
    await saveSessionRecords(session.id, user.userId, entries);
    return c.json({ saved: entries.length });
  })

  // ---------- Tự điểm danh bằng QR (phía chủ nhóm) ----------

  /** Mở tự điểm danh: tạo khóa QR mới, ghi sẵn "Vắng" cho người chưa có kết quả */
  .post("/sessions/:id/self-checkin/open", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    const members = await listMembers(session.groupId);
    await openSelfCheckIn(session.id, members.map((m) => m.id), user.userId);
    return c.json({ ...session, selfCheckInOpen: true });
  })

  .post("/sessions/:id/self-checkin/close", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    await closeSelfCheckIn(session.id);
    return c.json({ ...session, selfCheckInOpen: false });
  })

  /**
   * Mã QR hiện tại để trình chiếu (đổi mỗi 30 giây) và số người đã điểm danh.
   * windowEndsAt / serverNow tính bằng mili giây theo giờ máy chủ, để client đếm ngược chính xác.
   */
  .get("/sessions/:id/qr", async (c) => {
    const user = requireUser(c);
    const session = await ownedSessionOr404(idParam(c, "id", "buổi điểm danh"), user.userId);
    const secret = await getCheckInSecret(session.id);
    if (!secret) return c.json({ open: false as const });
    const url = `${webUrl()}/c/${encodeShortCode(session.id, createCheckInToken(session.id, secret))}`;
    const [qrDataUrl, checkedIn, members] = await Promise.all([
      toDataURL(url, { margin: 2, width: 640, errorCorrectionLevel: "L" }),
      countCheckedIn(session.id),
      listMembers(session.groupId),
    ]);
    return c.json({
      open: true as const,
      url,
      qrDataUrl,
      checkedIn,
      total: members.length,
      windowEndsAt: currentWindowEndsAt(),
      serverNow: Date.now(),
    });
  })

  // ---------- Tự điểm danh (phía thành viên, công khai) ----------

  /**
   * Trang chọn tên sau khi quét QR: ?t=<token trong mã QR>.
   * Không trả ghi chú hay kết quả chi tiết, chỉ biết ai đã điểm danh.
   */
  .get("/checkin/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const session = isValidId(sessionId) ? await getAttendanceSession(sessionId) : null;
    const secret = session ? await getCheckInSecret(session.id) : null;
    if (!session || !secret) fail(410, "closed", "Buổi điểm danh đã đóng.");
    if (!verifyCheckInToken(session!.id, secret!, c.req.query("t"))) {
      fail(410, "expired", "Mã QR đã hết hạn. Hãy quét lại mã trên màn hình.");
    }
    const viewer = c.get("user");
    const [members, records, groupName] = await Promise.all([
      listMembers(session!.groupId),
      getSessionRecords(session!.id),
      getGroupName(session!.groupId),
    ]);
    return c.json({
      sessionId: session!.id,
      title: session!.title,
      date: session!.date,
      groupName: groupName ?? "",
      members: members.map((m) => {
        const st = records.get(m.id)?.status;
        return {
          id: m.id,
          name: m.name,
          code: m.code,
          /** Đã liên kết tài khoản: phải đăng nhập đúng tài khoản đó mới điểm danh được */
          linked: !!m.linkedUserId,
          isMe: !!viewer && m.linkedUserId === viewer.userId,
          checkedIn: st === "present" || st === "late",
        };
      }),
    });
  })

  /**
   * Điểm danh: { "token": "<token trong mã QR>", "memberId": "..." }.
   * Giới hạn "mỗi điện thoại một người mỗi buổi" do client tự giữ (web dùng cookie).
   */
  .post("/checkin/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const body = await readJson(c);
    const memberId = str(body, "memberId");
    if (!isValidId(sessionId) || !isValidId(memberId)) fail(422, "validation", "Dữ liệu không hợp lệ.");
    const session = await getAttendanceSession(sessionId);
    const secret = session ? await getCheckInSecret(sessionId) : null;
    if (!session || !secret) fail(410, "closed", "Buổi điểm danh đã đóng.");
    if (!verifyCheckInToken(sessionId, secret!, str(body, "token"))) {
      fail(410, "expired", "Mã QR đã hết hạn. Hãy quét lại mã trên màn hình.");
    }
    const member = await getMember(memberId);
    if (!member || member.groupId !== session!.groupId) fail(404, "not_found", "Không tìm thấy tên này trong nhóm.");
    if (member!.linkedUserId) {
      const viewer = c.get("user");
      if (!viewer) fail(401, "login_required", `${member!.name} đã liên kết tài khoản. Hãy đăng nhập để điểm danh.`);
      if (viewer!.userId !== member!.linkedUserId) {
        fail(403, "wrong_account", `${member!.name} đã liên kết với một tài khoản khác. Bạn chỉ điểm danh được cho chính mình.`);
      }
    }
    const result = await recordSelfCheckIn(sessionId, memberId);
    if (result === "already") {
      fail(409, "already", `${member!.name} đã được điểm danh rồi. Nếu không phải bạn, hãy báo người quản lý.`);
    }
    return c.json({ ok: true, memberId, name: member!.name });
  });
