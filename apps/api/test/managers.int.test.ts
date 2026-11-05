// Người quản lý nhóm với MongoDB thật: chủ nhóm chọn quyền cho từng người; quyền áp dụng xuống nhóm con;
// thêm theo email hoặc link mời; gỡ / tự rời; chuyển quyền chủ nhóm.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { call, newUser, skipWithoutDb } from "./helpers.ts";

type U = Awaited<ReturnType<typeof newUser>>;

async function newGroup(token: string, name = `Nhóm ${Math.random()}`, parentId?: string) {
  const g = await call("POST", "/v1/groups", { token, body: { name, parentId } });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  return g.body.id as string;
}

async function addManager(owner: U, groupId: string, who: U, permissions: string[]) {
  const r = await call("POST", `/v1/groups/${groupId}/managers`, { token: owner.token, body: { email: who.email, permissions } });
  assert.equal(r.status, 204, JSON.stringify(r.body));
}

const status = async (method: string, path: string, token: string, body?: unknown) => (await call(method, path, { token, body })).status;

describe("Người quản lý nhóm (MongoDB thật)", { skip: skipWithoutDb }, () => {
  test("quản lý chỉ làm được việc có quyền; xem thì luôn được; việc của chủ nhóm thì không", async () => {
    const owner = await newUser("Chủ");
    const mgr = await newUser("Quản lý");
    const g = await newGroup(owner.token);
    await call("POST", `/v1/groups/${g}/members`, { token: owner.token, body: { text: "An\nBình" } });
    const s = (await call("POST", `/v1/groups/${g}/sessions`, { token: owner.token, body: { date: "2026-11-05" } })).body.id;
    const an = (await call("GET", `/v1/groups/${g}/members`, { token: owner.token })).body.members[0].id;

    // Chưa là quản lý: như người lạ
    assert.equal(await status("GET", `/v1/groups/${g}`, mgr.token), 404);

    await addManager(owner, g, mgr, ["attendance"]);
    const detail = await call("GET", `/v1/groups/${g}`, { token: mgr.token });
    assert.equal(detail.status, 200);
    assert.deepEqual(detail.body.access, { role: "manager", permissions: ["attendance"] });
    const list = await call("GET", "/v1/groups", { token: mgr.token });
    assert.equal(list.body.groups.find((x: any) => x.id === g)?.access.role, "manager");
    assert.equal((await call("GET", `/v1/sessions/${s}`, { token: mgr.token })).body.access.role, "manager");

    // Trang nhóm luôn gọi các API xem này: quản lý không có quyền Liên kết tài khoản vẫn mở được trang (không thấy link)
    await call("POST", `/v1/groups/${g}/invite`, { token: owner.token });
    for (const path of [`/v1/groups/${g}/members`, `/v1/groups/${g}/sessions`, `/v1/groups/${g}/requests`, `/v1/groups/${g}/managers`]) {
      assert.equal(await status("GET", path, mgr.token), 200, path);
    }
    const invite = await call("GET", `/v1/groups/${g}/invite`, { token: mgr.token });
    assert.equal(invite.status, 200);
    assert.equal(invite.body.link, null);
    assert.notEqual((await call("GET", `/v1/groups/${g}/invite`, { token: owner.token })).body.link, null);

    // Có quyền Điểm danh
    assert.equal(await status("PUT", `/v1/sessions/${s}/records`, mgr.token, { records: [{ memberId: an, status: "present" }] }), 200);
    assert.equal(await status("POST", `/v1/sessions/${s}/self-checkin/open`, mgr.token), 200);
    // Không có quyền khác: 403 kèm câu báo
    const noMembers = await call("POST", `/v1/groups/${g}/members`, { token: mgr.token, body: { text: "Chi" } });
    assert.equal(noMembers.status, 403);
    assert.match(noMembers.body.error.message, /Thành viên/);
    assert.equal(await status("POST", `/v1/groups/${g}/sessions`, mgr.token, { date: "2026-11-06" }), 403);
    assert.equal(await status("DELETE", `/v1/sessions/${s}`, mgr.token), 403);
    assert.equal(await status("POST", `/v1/members/${an}/invite`, mgr.token), 403);
    assert.equal(await status("PATCH", `/v1/groups/${g}`, mgr.token, { name: "Tên mới" }), 403);
    // Việc chỉ chủ nhóm làm
    assert.equal(await status("DELETE", `/v1/groups/${g}`, mgr.token), 403);
    const other = await newUser();
    assert.equal(await status("POST", `/v1/groups/${g}/managers`, mgr.token, { email: other.email, permissions: [] }), 403);
    assert.equal(await status("POST", `/v1/groups/${g}/manager-invite`, mgr.token, { permissions: [] }), 403);
    assert.equal(await status("POST", `/v1/groups/${g}/transfer`, mgr.token, { email: other.email }), 403);

    // Chủ nhóm sửa quyền: thêm Thành viên → làm được ngay
    assert.equal(await status("PATCH", `/v1/groups/${g}/managers/${mgr.id}`, owner.token, { permissions: ["attendance", "members"] }), 204);
    assert.equal(await status("POST", `/v1/groups/${g}/members`, mgr.token, { text: "Chi" }), 201);
  });

  test("quyền áp dụng xuống nhóm con; nhóm con do quản lý tạo vẫn thuộc chủ nhóm", async () => {
    const owner = await newUser("Chủ");
    const mgr = await newUser("Quản lý khối");
    const root = await newGroup(owner.token, "Khối 10");
    const child = await newGroup(owner.token, "Lớp 10A", root);
    await addManager(owner, root, mgr, ["subgroups", "sessions"]);

    // Thấy cả nhóm con trong danh sách, quyền kế thừa
    const tree = (await call("GET", "/v1/groups", { token: mgr.token })).body.groups;
    assert.deepEqual(tree.map((x: any) => x.id).sort(), [root, child].sort());
    assert.equal(await status("POST", `/v1/groups/${child}/sessions`, mgr.token, { date: "2026-11-05" }), 201);

    // Quản lý tạo nhóm con: chủ nhóm thấy và làm chủ
    const made = await newGroup(mgr.token, "Lớp 10B", root);
    const ownerSees = await call("GET", `/v1/groups/${made}`, { token: owner.token });
    assert.equal(ownerSees.body.access.role, "owner");

    // Danh sách quản lý của nhóm con: hiện người được thêm ở nhóm cha
    const ms = await call("GET", `/v1/groups/${child}/managers`, { token: owner.token });
    const row = ms.body.managers.find((m: any) => m.account.id === mgr.id);
    assert.equal(row.fromGroup.id, root);
    assert.equal(ms.body.owner.id, (await call("GET", "/v1/me", { token: owner.token })).body.id);
    // Sửa ở nhóm con không được (thêm ở nhóm cha thì sửa ở nhóm cha)
    assert.equal(await status("PATCH", `/v1/groups/${child}/managers/${mgr.id}`, owner.token, { permissions: [] }), 404);

    // Breadcrumb của quản lý chỉ có nhóm cha mình có quyền
    const mgr2 = await newUser("Quản lý lớp");
    await addManager(owner, child, mgr2, []);
    const childDetail = await call("GET", `/v1/groups/${child}`, { token: mgr2.token });
    assert.equal(childDetail.status, 200);
    assert.deepEqual(childDetail.body.ancestors, []);
    assert.equal(await status("GET", `/v1/groups/${root}`, mgr2.token), 404);
  });

  test("thêm theo email: chưa có tài khoản thì báo rõ; người lạ vẫn 404", async () => {
    const owner = await newUser();
    const g = await newGroup(owner.token);
    const r = await call("POST", `/v1/groups/${g}/managers`, { token: owner.token, body: { email: "chua-co@test.local", permissions: [] } });
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, "account_not_found");
    const stranger = await newUser();
    assert.equal(await status("GET", `/v1/groups/${g}/managers`, stranger.token), 404);
  });

  test("link mời quản lý: xem thông tin, nhận lời (1 lần), chủ nhóm được báo", async () => {
    const owner = await newUser("Chủ");
    const g = await newGroup(owner.token, "Lớp Nhảy");
    const inv = await call("POST", `/v1/groups/${g}/manager-invite`, { token: owner.token, body: { permissions: ["members", "attendance"] } });
    assert.equal(inv.status, 201);
    const token = new URL(inv.body.link.url).pathname.split("/").pop()!;
    assert.match(inv.body.link.url, /\/manage\//);

    const info = await call("GET", `/v1/manager-invites/${token}`);
    assert.equal(info.status, 200);
    assert.equal(info.body.groupName, "Lớp Nhảy");
    assert.equal(info.body.invitedBy, "Chủ");
    assert.deepEqual(info.body.permissions, ["attendance", "members"]);

    // Chủ nhóm tự nhận: không được
    assert.equal(await status("POST", `/v1/manager-invites/${token}/accept`, owner.token), 409);
    const mgr = await newUser("Người nhận");
    const acc = await call("POST", `/v1/manager-invites/${token}/accept`, { token: mgr.token });
    assert.equal(acc.status, 200, JSON.stringify(acc.body));
    assert.equal(acc.body.groupId, g);
    assert.deepEqual((await call("GET", `/v1/groups/${g}`, { token: mgr.token })).body.access, { role: "manager", permissions: ["attendance", "members"] });

    // Link dùng 1 lần
    const late = await newUser();
    assert.equal(await status("POST", `/v1/manager-invites/${token}/accept`, late.token), 410);
    assert.equal((await call("GET", `/v1/manager-invites/${token}`)).status, 410);

    const notes = await call("GET", "/v1/notifications", { token: owner.token });
    assert.ok(notes.body.items.some((n: any) => n.type === "group_manager.joined"), JSON.stringify(notes.body));
  });

  test("gỡ quản lý và tự rời", async () => {
    const owner = await newUser();
    const a = await newUser();
    const b = await newUser();
    const g = await newGroup(owner.token);
    await addManager(owner, g, a, ["attendance"]);
    await addManager(owner, g, b, ["attendance"]);
    // Người được thêm nhận thông báo
    const notes = await call("GET", "/v1/notifications", { token: a.token });
    assert.ok(notes.body.items.some((n: any) => n.type === "group_manager.added"));

    assert.equal(await status("DELETE", `/v1/groups/${g}/managers/${b.id}`, a.token), 403, "quản lý không gỡ được người khác");
    assert.equal(await status("DELETE", `/v1/groups/${g}/managers/${a.id}`, a.token), 204, "tự rời");
    assert.equal(await status("GET", `/v1/groups/${g}`, a.token), 404);
    assert.equal(await status("DELETE", `/v1/groups/${g}/managers/${b.id}`, owner.token), 204);
    assert.equal(await status("GET", `/v1/groups/${g}`, b.token), 404);
  });

  test("chuyển quyền chủ nhóm: chủ mới có mọi quyền, chủ cũ ở lại làm quản lý (không xóa được nhóm)", async () => {
    const oldOwner = await newUser("Chủ cũ");
    const newOwner = await newUser("Chủ mới");
    const root = await newGroup(oldOwner.token);
    const child = await newGroup(oldOwner.token, "Con", root);
    await addManager(oldOwner, root, newOwner, ["attendance"]);

    assert.equal(await status("POST", `/v1/groups/${root}/transfer`, oldOwner.token, { email: newOwner.email }), 204);
    for (const id of [root, child]) {
      assert.equal((await call("GET", `/v1/groups/${id}`, { token: newOwner.token })).body.access.role, "owner");
      assert.equal((await call("GET", `/v1/groups/${id}`, { token: oldOwner.token })).body.access.role, "manager");
    }
    const ms = (await call("GET", `/v1/groups/${root}/managers`, { token: newOwner.token })).body;
    assert.equal(ms.owner.id, newOwner.id);
    assert.ok(!ms.managers.some((m: any) => m.account.id === newOwner.id), "chủ mới không còn trong danh sách quản lý");
    assert.equal(ms.managers.find((m: any) => m.account.id === oldOwner.id).permissions.length, 5);

    assert.equal(await status("DELETE", `/v1/groups/${child}`, oldOwner.token), 403);
    assert.equal(await status("DELETE", `/v1/groups/${child}`, newOwner.token), 204);
    const notes = await call("GET", "/v1/notifications", { token: newOwner.token });
    assert.ok(notes.body.items.some((n: any) => n.type === "group.ownership_transferred"));
  });
});
