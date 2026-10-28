// /v1/groups: nhóm nhiều cấp, thành viên của nhóm, link tham gia nhóm và yêu cầu chờ duyệt
import { Hono } from "hono";
import { requireUser, type AppEnv } from "../auth.js";
import { buildShareLink } from "../core/lib/share.js";
import { getBranchStats, getMemberRates } from "../core/modules/attendance/stats.service.js";
import {
  createGroup,
  deleteGroup,
  getAncestors,
  getChildGroups,
  getOwnedGroupTree,
  renameGroup,
  type GroupTreeNode,
} from "../core/modules/groups/group.service.js";
import {
  createGroupInvite,
  disableGroupInvite,
  getActiveGroupInvite,
  getGroupsWithActiveInvite,
  listPendingRequests,
} from "../core/modules/invites/invite.service.js";
import { addMembersFromText, listMembers } from "../core/modules/members/member.service.js";
import { listSessionsWithCounts } from "../core/modules/attendance/attendance.service.js";
import { getAccountsByIds } from "../core/modules/users/user.service.js";
import { fail, idParam, readJson, requiredStr, str } from "../http.js";
import { createSessionFromBody } from "./sessions.js";
import { ownedGroupOr404 } from "./owned.js";

function allIds(nodes: GroupTreeNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...allIds(n.children)]);
}

type TreeOut = { id: string; name: string; parentId: string | null; memberCount: number; inviteActive: boolean; children: TreeOut[] };

function withInvite(nodes: GroupTreeNode[], on: Set<string>): TreeOut[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    parentId: n.parentId,
    memberCount: n.memberCount,
    inviteActive: on.has(n.id),
    children: withInvite(n.children, on),
  }));
}

export const groups = new Hono<AppEnv>()
  /** Cây các nhóm tôi quản lý */
  .get("/groups", async (c) => {
    const user = requireUser(c);
    const tree = await getOwnedGroupTree(user.userId);
    const on = await getGroupsWithActiveInvite(allIds(tree));
    return c.json({ groups: withInvite(tree, on) });
  })

  /** Tạo nhóm; có parentId là tạo nhóm con */
  .post("/groups", async (c) => {
    const user = requireUser(c);
    const body = await readJson(c);
    const name = requiredStr(body, "name", "tên nhóm", 120);
    const parentId = str(body, "parentId") || null;
    if (parentId) await ownedGroupOr404(parentId, user.userId);
    const g = await createGroup({ name, parentId, ownerId: user.userId });
    return c.json(g, 201);
  })

  /** Chi tiết nhóm: đường dẫn nhóm cha, nhóm con kèm thống kê, link tham gia */
  .get("/groups/:id", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const [ancestors, children, members, sessions, invite, requests] = await Promise.all([
      getAncestors(group, user.userId),
      getChildGroups(group.id, user.userId),
      listMembers(group.id),
      listSessionsWithCounts(group.id),
      getActiveGroupInvite(group.id),
      listPendingRequests(group.id),
    ]);
    const branch = await getBranchStats([group.id, ...children.map((ch) => ch.id)]);
    return c.json({
      ...group,
      ancestors: ancestors.map((a) => ({ id: a.id, name: a.name })),
      memberCount: members.length,
      sessionCount: sessions.length,
      pendingRequestCount: requests.length,
      inviteActive: !!invite,
      /** Chuyên cần chung của nhóm này và mọi nhóm con bên trong */
      branchStats: branch.get(group.id) ?? null,
      children: children.map((ch) => ({ id: ch.id, name: ch.name, stats: branch.get(ch.id) ?? null })),
    });
  })

  .patch("/groups/:id", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const name = requiredStr(await readJson(c), "name", "tên nhóm", 120);
    await renameGroup(group.id, user.userId, name);
    return c.json({ ...group, name });
  })

  /** Xóa nhóm cùng thành viên và dữ liệu điểm danh. Còn nhóm con thì không cho xóa. */
  .delete("/groups/:id", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const ok = await deleteGroup(group.id, user.userId);
    if (!ok) fail(409, "has_children", "Hãy xóa các nhóm con bên trong trước.");
    return c.body(null, 204);
  })

  // ---------- Thành viên ----------

  /** Danh sách thành viên kèm tài khoản đã liên kết và tỷ lệ chuyên cần. ?sort=rate: chuyên cần thấp lên đầu */
  .get("/groups/:id/members", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const [members, rates] = await Promise.all([listMembers(group.id), getMemberRates(group.id)]);
    const accounts = await getAccountsByIds(members.map((m) => m.linkedUserId).filter((x): x is string => !!x));
    let list = members.map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      linkedAccount: m.linkedUserId ? (accounts.get(m.linkedUserId) ?? null) : null,
      stats: rates.get(m.id) ?? { counts: {}, recorded: 0, rate: null },
    }));
    if (c.req.query("sort") === "rate") {
      list = [...list].sort((a, b) => {
        const ra = a.stats.rate;
        const rb = b.stats.rate;
        if (ra === null || rb === null) return ra === rb ? 0 : ra === null ? 1 : -1;
        return ra - rb;
      });
    }
    return c.json({ members: list });
  })

  /**
   * Thêm nhiều thành viên. Gửi { "text": "..." } (mỗi dòng một người, "Mã, Tên" hoặc "Tên"; dán từ Excel được)
   * hoặc { "members": [{ "name": "...", "code": "..." }] }.
   */
  .post("/groups/:id/members", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const body = await readJson(c);
    let text = str(body, "text");
    if (!text && Array.isArray(body.members)) {
      text = body.members
        .map((m) => {
          const o = (m ?? {}) as Record<string, unknown>;
          const name = typeof o.name === "string" ? o.name.replace(/[\t,\r\n]+/g, " ").trim() : "";
          const code = typeof o.code === "string" ? o.code.replace(/[\t,\r\n]+/g, " ").trim() : "";
          return name ? (code ? `${code}\t${name}` : name) : "";
        })
        .filter(Boolean)
        .join("\n");
    }
    if (!text) fail(422, "validation", "Chưa có tên thành viên nào.");
    const added = await addMembersFromText(group.id, text);
    return c.json({ added }, 201);
  })

  // ---------- Buổi điểm danh của nhóm ----------

  .get("/groups/:id/sessions", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    return c.json({ sessions: await listSessionsWithCounts(group.id) });
  })

  /** Tạo buổi: { "title"?: "...", "date": "YYYY-MM-DD" } */
  .post("/groups/:id/sessions", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const session = await createSessionFromBody(group.id, user.userId, await readJson(c));
    return c.json(session, 201);
  })

  // ---------- Link tham gia nhóm (cách B) ----------

  .get("/groups/:id/invite", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const invite = await getActiveGroupInvite(group.id);
    return c.json({ link: invite ? await buildShareLink(`/join/${invite.token}`, null) : null });
  })

  /** Bật link, hoặc tạo link mới thay link cũ (link cũ hết hiệu lực) */
  .post("/groups/:id/invite", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const token = await createGroupInvite(group.id, user.userId);
    return c.json({ link: await buildShareLink(`/join/${token}`, null) }, 201);
  })

  .delete("/groups/:id/invite", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    await disableGroupInvite(group.id);
    return c.body(null, 204);
  })

  /** Yêu cầu liên kết đang chờ chủ nhóm duyệt */
  .get("/groups/:id/requests", async (c) => {
    const user = requireUser(c);
    const group = await ownedGroupOr404(idParam(c, "id", "nhóm"), user.userId);
    const [requests, members] = await Promise.all([listPendingRequests(group.id), listMembers(group.id)]);
    const accounts = await getAccountsByIds(requests.map((r) => String(r.userId)));
    const names = new Map(members.map((m) => [m.id, m.name]));
    return c.json({
      requests: requests.map((r) => ({
        id: String(r._id),
        account: accounts.get(String(r.userId)) ?? null,
        memberId: String(r.memberId),
        memberName: names.get(String(r.memberId)) ?? null,
        createdAt: r.createdAt,
      })),
    });
  });
