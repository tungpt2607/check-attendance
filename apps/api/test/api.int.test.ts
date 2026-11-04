// Kiểm thử tích hợp API với MongoDB thật (chạy trong CI; trên máy cần MONGODB_TEST_URI, xem helpers.ts).
// Mỗi kịch bản tự tạo tài khoản/nhóm riêng nên chạy độc lập với nhau.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decodeShortCode } from "@check-attendance/shared/short-code";
import { call, faceOf, newUser, skipWithoutDb } from "./helpers.ts";

/** Tạo nhóm có sẵn thành viên (theo thứ tự tên) */
async function groupWith(token: string, names: string[], parentId?: string) {
  const g = await call("POST", "/v1/groups", { token, body: { name: `Nhóm ${Math.random()}`, parentId } });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  if (names.length) {
    const add = await call("POST", `/v1/groups/${g.body.id}/members`, { token, body: { text: names.join("\n") } });
    assert.equal(add.status, 201);
  }
  const list = await call("GET", `/v1/groups/${g.body.id}/members`, { token });
  const byName = Object.fromEntries(list.body.members.map((m: { name: string; id: string }) => [m.name, m.id]));
  return { id: g.body.id as string, member: byName as Record<string, string> };
}

async function sessionIn(token: string, groupId: string, date = "2026-11-04") {
  const s = await call("POST", `/v1/groups/${groupId}/sessions`, { token, body: { title: `Buổi ${date}`, date } });
  assert.equal(s.status, 201, JSON.stringify(s.body));
  return s.body.id as string;
}

async function mark(token: string, sessionId: string, records: Record<string, "present" | "late" | "absent">) {
  const r = await call("PUT", `/v1/sessions/${sessionId}/records`, {
    token,
    body: { records: Object.entries(records).map(([memberId, status]) => ({ memberId, status })) },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}

describe("API với MongoDB thật", { skip: skipWithoutDb }, () => {
  test("/health trả phiên bản", async () => {
    const r = await call("GET", "/health");
    assert.equal(r.status, 200);
    assert.match(r.body.version, /^\d+\.\d+\.\d+$/);
  });

  test("chuyên cần từng thành viên (MongoDB đếm sẵn) và chi tiết nhóm chỉ đếm", async () => {
    const { token } = await newUser("Chủ nhóm");
    const g = await groupWith(token, ["An", "Bình", "Chi"]);
    const s1 = await sessionIn(token, g.id, "2026-11-01");
    const s2 = await sessionIn(token, g.id, "2026-11-02");
    const s3 = await sessionIn(token, g.id, "2026-11-03");
    await mark(token, s1, { [g.member.An]: "present", [g.member["Bình"]]: "absent", [g.member.Chi]: "late" });
    await mark(token, s2, { [g.member.An]: "late", [g.member["Bình"]]: "absent" });
    await mark(token, s3, { [g.member.An]: "absent" });

    const list = await call("GET", `/v1/groups/${g.id}/members`, { token });
    const stats = Object.fromEntries(list.body.members.map((m: any) => [m.name, m.stats]));
    assert.deepEqual(stats.An, { counts: { present: 1, late: 1, absent: 1 }, recorded: 3, rate: 2 / 3 });
    assert.deepEqual(stats["Bình"], { counts: { absent: 2 }, recorded: 2, rate: 0 });
    assert.deepEqual(stats.Chi, { counts: { late: 1 }, recorded: 1, rate: 1 });

    // Sắp xếp theo chuyên cần thấp lên đầu
    const byRate = await call("GET", `/v1/groups/${g.id}/members?sort=rate`, { token });
    assert.equal(byRate.body.members[0].name, "Bình");

    const detail = await call("GET", `/v1/groups/${g.id}`, { token });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.memberCount, 3);
    assert.equal(detail.body.sessionCount, 3);
    assert.equal(detail.body.pendingRequestCount, 0);
    assert.equal(detail.body.inviteActive, false);
    // Cả nhánh: 3 có mặt/muộn trên 6 lượt có kết quả
    assert.equal(detail.body.branchStats.recorded, 6);
    assert.equal(detail.body.branchStats.rate, 3 / 6);
    assert.equal(detail.body.branchStats.memberCount, 3);
    assert.equal(detail.body.branchStats.sessionCount, 3);

    // Lịch sử một thành viên (chủ nhóm xem) dùng cùng cách tính
    const an = await call("GET", `/v1/members/${g.member.An}`, { token });
    assert.equal(an.body.stats.rate, 2 / 3);
    assert.equal(an.body.history.length, 3);
    assert.equal(an.body.history[0].date.slice(0, 10), "2026-11-03", "buổi mới nhất trước");
  });

  test("chuyên cần cả nhánh gộp nhóm con; nhóm không có buổi nào thì tỷ lệ null", async () => {
    const { token } = await newUser();
    const root = await groupWith(token, ["Gốc 1"]);
    const child = await groupWith(token, ["Con 1", "Con 2"], root.id);
    const empty = await groupWith(token, ["Trống"], root.id);
    const sr = await sessionIn(token, root.id);
    const sc = await sessionIn(token, child.id);
    await mark(token, sr, { [root.member["Gốc 1"]]: "present" });
    await mark(token, sc, { [child.member["Con 1"]]: "absent", [child.member["Con 2"]]: "present" });

    const d = await call("GET", `/v1/groups/${root.id}`, { token });
    assert.equal(d.body.branchStats.memberCount, 4);
    assert.equal(d.body.branchStats.sessionCount, 2);
    assert.equal(d.body.branchStats.recorded, 3);
    assert.equal(d.body.branchStats.rate, 2 / 3);
    const kids = Object.fromEntries(d.body.children.map((c: any) => [c.id, c.stats]));
    assert.equal(kids[child.id].rate, 1 / 2);
    assert.equal(kids[child.id].memberCount, 2);
    assert.equal(kids[empty.id].rate, null);
    assert.equal(kids[empty.id].sessionCount, 0);
  });

  test("chỉ chủ nhóm xem được nhóm, buổi, thành viên (người khác nhận 404)", async () => {
    const owner = await newUser();
    const other = await newUser();
    const g = await groupWith(owner.token, ["An"]);
    const s = await sessionIn(owner.token, g.id);
    for (const path of [`/v1/groups/${g.id}`, `/v1/groups/${g.id}/members`, `/v1/sessions/${s}`, `/v1/members/${g.member.An}`]) {
      const r = await call("GET", path, { token: other.token });
      assert.equal(r.status, 404, path);
    }
    const noLogin = await call("GET", `/v1/groups/${g.id}`);
    assert.equal(noLogin.status, 401);
  });

  test("tự điểm danh bằng QR: mở, quét mã, không cho điểm danh hai lần", async () => {
    const { token } = await newUser();
    const g = await groupWith(token, ["An", "Bình"]);
    const s = await sessionIn(token, g.id);
    assert.equal((await call("POST", `/v1/sessions/${s}/self-checkin/open`, { token })).status, 200);
    const qr = await call("GET", `/v1/sessions/${s}/qr`, { token });
    assert.equal(qr.body.open, true);
    const code = decodeShortCode(new URL(qr.body.url).pathname.split("/").pop()!);
    assert.equal(code?.sessionId, s);

    const info = await call("GET", `/v1/checkin/${s}?t=${code!.token}`);
    assert.equal(info.status, 200);
    assert.equal(info.body.members.length, 2);

    const ok = await call("POST", `/v1/checkin/${s}`, { body: { token: code!.token, memberId: g.member.An } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const again = await call("POST", `/v1/checkin/${s}`, { body: { token: code!.token, memberId: g.member.An } });
    assert.equal(again.status, 409);
    const wrongToken = await call("POST", `/v1/checkin/${s}`, { body: { token: "sai-ma", memberId: g.member["Bình"] } });
    assert.equal(wrongToken.status, 410);

    const detail = await call("GET", `/v1/sessions/${s}`, { token });
    const an = detail.body.rows.find((r: any) => r.memberId === g.member.An);
    assert.equal(an.status, "present");
    assert.equal(an.source, "self");
    assert.ok(an.checkedInAt);

    await call("POST", `/v1/sessions/${s}/self-checkin/close`, { token });
    const closed = await call("GET", `/v1/checkin/${s}?t=${code!.token}`);
    assert.equal(closed.status, 410);
  });

  test("điểm danh bằng khuôn mặt: chưa nhận ra → chọn tên (lưu vào thành viên) → lần sau tự nhận ra → Sai người", async () => {
    const { token } = await newUser();
    const g = await groupWith(token, ["An", "Bình"]);
    const s = await sessionIn(token, g.id);

    const unknown = await call("POST", `/v1/sessions/${s}/face/scan`, { token, body: { descriptor: faceOf(1) } });
    assert.deepEqual(unknown.body, { result: "unknown" });

    const assigned = await call("POST", `/v1/sessions/${s}/face/assign`, { token, body: { memberId: g.member.An, descriptor: faceOf(1) } });
    assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
    assert.equal(assigned.body.faceSaved, "member");
    assert.equal(assigned.body.already, false);
    assert.equal((await call("GET", `/v1/members/${g.member.An}`, { token })).body.face, "member");

    // Cùng người: đã điểm danh rồi
    const already = await call("POST", `/v1/sessions/${s}/face/scan`, { token, body: { descriptor: faceOf(1, 0.02) } });
    assert.equal(already.body.result, "already");
    assert.equal(already.body.memberId, g.member.An);
    // Người khác hẳn: không nhận nhầm
    assert.equal((await call("POST", `/v1/sessions/${s}/face/scan`, { token, body: { descriptor: faceOf(2) } })).body.result, "unknown");

    // Buổi sau: tự nhận ra và ghi Có mặt, rồi bấm "Sai người"
    const s2 = await sessionIn(token, g.id, "2026-11-05");
    const matched = await call("POST", `/v1/sessions/${s2}/face/scan`, { token, body: { descriptor: faceOf(1, 0.02) } });
    assert.equal(matched.body.result, "checked_in");
    assert.equal(matched.body.memberId, g.member.An);
    assert.equal(matched.body.previousStatus, null);
    let row = (await call("GET", `/v1/sessions/${s2}`, { token })).body.rows.find((r: any) => r.memberId === g.member.An);
    assert.equal(row.status, "present");
    assert.equal(row.source, "face");

    const undo = await call("POST", `/v1/sessions/${s2}/face/undo`, { token, body: { memberId: g.member.An, previousStatus: null } });
    assert.equal(undo.status, 204);
    row = (await call("GET", `/v1/sessions/${s2}`, { token })).body.rows.find((r: any) => r.memberId === g.member.An);
    assert.equal(row.status, null, "hoàn tác: về như chưa có kết quả");

    // Xóa thành viên thì khuôn mặt lưu riêng của thành viên cũng mất
    assert.equal((await call("DELETE", `/v1/members/${g.member.An}`, { token })).status, 204);
    assert.equal((await call("POST", `/v1/sessions/${s2}/face/scan`, { token, body: { descriptor: faceOf(1) } })).body.result, "unknown");
  });

  test("khuôn mặt của thành viên đã liên kết lưu vào tài khoản (chỉ khi tài khoản chưa có), dùng được ở nhóm khác", async () => {
    const owner = await newUser("Chủ nhóm");
    const binh = await newUser("Bình");
    const g = await groupWith(owner.token, ["Bình"]);
    // Liên kết tài khoản Bình với thành viên "Bình" qua link mời riêng
    const inv = await call("POST", `/v1/members/${g.member["Bình"]}/invite`, { token: owner.token });
    assert.equal(inv.status, 201);
    const inviteToken = new URL(inv.body.link.url).pathname.split("/").pop()!;
    assert.equal((await call("POST", `/v1/invites/${inviteToken}/accept`, { token: binh.token })).status, 200);

    const s = await sessionIn(owner.token, g.id);
    const a1 = await call("POST", `/v1/sessions/${s}/face/assign`, { token: owner.token, body: { memberId: g.member["Bình"], descriptor: faceOf(3) } });
    assert.equal(a1.body.faceSaved, "account");
    assert.equal((await call("GET", "/v1/me/face", { token: binh.token })).body.hasFace, true);
    // Tài khoản đã có khuôn mặt: chọn lại không ghi đè
    const a2 = await call("POST", `/v1/sessions/${s}/face/assign`, { token: owner.token, body: { memberId: g.member["Bình"], descriptor: faceOf(4) } });
    assert.equal(a2.body.faceSaved, null);
    assert.equal(a2.body.already, true);

    // Nhóm khác của chủ nhóm khác cũng có Bình (đã liên kết): nhận ra ngay nhờ khuôn mặt của tài khoản
    const owner2 = await newUser();
    const g2 = await groupWith(owner2.token, ["Bình (lớp 2)"]);
    const inv2 = await call("POST", `/v1/members/${g2.member["Bình (lớp 2)"]}/invite`, { token: owner2.token });
    await call("POST", `/v1/invites/${new URL(inv2.body.link.url).pathname.split("/").pop()}/accept`, { token: binh.token });
    const s2 = await sessionIn(owner2.token, g2.id);
    const m = await call("POST", `/v1/sessions/${s2}/face/scan`, { token: owner2.token, body: { descriptor: faceOf(3, 0.02) } });
    assert.equal(m.body.result, "checked_in");

    // Bình tự xóa khuôn mặt: không còn nhận ra
    assert.equal((await call("DELETE", "/v1/me/face", { token: binh.token })).status, 204);
    const s3 = await sessionIn(owner2.token, g2.id, "2026-11-06");
    assert.equal((await call("POST", `/v1/sessions/${s3}/face/scan`, { token: owner2.token, body: { descriptor: faceOf(3) } })).body.result, "unknown");

    // Bình tự xem lịch sử của mình: cùng cách tính tỷ lệ
    const mine = await call("GET", `/v1/memberships/${g.member["Bình"]}`, { token: binh.token });
    assert.equal(mine.status, 200, JSON.stringify(mine.body));
    assert.equal(mine.body.rate, 1);
    assert.equal(mine.body.recorded, 1);
  });

  test("dữ liệu khuôn mặt sai độ dài bị từ chối (422)", async () => {
    const { token } = await newUser();
    const g = await groupWith(token, ["An"]);
    const s = await sessionIn(token, g.id);
    const r = await call("POST", `/v1/sessions/${s}/face/scan`, { token, body: { descriptor: [1, 2, 3] } });
    assert.equal(r.status, 422);
  });
});
