// /v1/groups: nhóm nhiều cấp, thành viên của nhóm, buổi điểm danh của nhóm, link tham gia và yêu cầu chờ duyệt
import { createRoute } from "@hono/zod-openapi";
import {
  AddedSchema,
  AddMembersInput,
  CreateGroupInput,
  CreateSessionInput,
  GroupDetailSchema,
  GroupListSchema,
  GroupSchema,
  InviteLinkSchema,
  LinkRequestListSchema,
  MemberListSchema,
  NewLinkSchema,
  RenameGroupInput,
  SessionListSchema,
  SessionSchema,
} from "@check-attendance/shared/api";
import { z } from "@hono/zod-openapi";
import { requireUser } from "../auth.js";
import { buildShareLink } from "../core/lib/share.js";
import { listSessionsWithCounts } from "../core/modules/attendance/attendance.service.js";
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
  countPendingRequests,
  listPendingRequests,
} from "../core/modules/invites/invite.service.js";
import { addMembersFromText, listMembers } from "../core/modules/members/member.service.js";
import { getAccountsByIds } from "../core/modules/users/user.service.js";
import { AUTH, createApp, fail, IdParam, iso, jsonBody, NO_CONTENT, ok } from "../http.js";
import { ownedGroupOr404 } from "./owned.js";
import { createSessionIn, sessionOut } from "./sessions.js";

const TAG = ["Nhóm"];
const MEMBER_TAG = ["Thành viên"];
const SESSION_TAG = ["Điểm danh"];

/** Cây nhóm → danh sách phẳng (thứ tự: nhóm cha rồi tới các nhóm con, theo tên) */
function flatten(nodes: GroupTreeNode[]): GroupTreeNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

export const groups = createApp()
  .openapi(
    createRoute({
      method: "get",
      path: "/groups",
      tags: TAG,
      summary: "Các nhóm tôi quản lý (danh sách phẳng, dựng cây theo parentId)",
      security: AUTH,
      responses: { 200: ok(GroupListSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const list = flatten(await getOwnedGroupTree(user.userId));
      const ids = list.map((g) => g.id);
      const [on, pending] = await Promise.all([getGroupsWithActiveInvite(ids), countPendingRequests(ids)]);
      return c.json(
        {
          groups: list.map((g) => ({
            id: g.id,
            name: g.name,
            parentId: g.parentId,
            memberCount: g.memberCount,
            inviteActive: on.has(g.id),
            pendingRequestCount: pending.get(g.id) ?? 0,
          })),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups",
      tags: TAG,
      summary: "Tạo nhóm (có parentId là tạo nhóm con)",
      security: AUTH,
      request: jsonBody(CreateGroupInput),
      responses: { 201: ok(GroupSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const { name, parentId } = c.req.valid("json");
      if (parentId) await ownedGroupOr404(parentId, user.userId);
      return c.json(await createGroup({ name, parentId: parentId ?? null, ownerId: user.userId }), 201);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/groups/{id}",
      tags: TAG,
      summary: "Chi tiết nhóm: nhóm cha, nhóm con kèm thống kê, chuyên cần cả nhánh",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(GroupDetailSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const [ancestors, children, members, sessions, invite, requests] = await Promise.all([
        getAncestors(group, user.userId),
        getChildGroups(group.id, user.userId),
        listMembers(group.id),
        listSessionsWithCounts(group.id),
        getActiveGroupInvite(group.id),
        listPendingRequests(group.id),
      ]);
      const branch = await getBranchStats([group.id, ...children.map((ch) => ch.id)]);
      return c.json(
        {
          ...group,
          ancestors: ancestors.map((a) => ({ id: a.id, name: a.name })),
          memberCount: members.length,
          sessionCount: sessions.length,
          pendingRequestCount: requests.length,
          inviteActive: !!invite,
          branchStats: branch.get(group.id) ?? null,
          children: children.map((ch) => ({ id: ch.id, name: ch.name, stats: branch.get(ch.id) ?? null })),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "patch",
      path: "/groups/{id}",
      tags: TAG,
      summary: "Đổi tên nhóm",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(RenameGroupInput) },
      responses: { 200: ok(GroupSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const { name } = c.req.valid("json");
      await renameGroup(group.id, user.userId, name);
      return c.json({ ...group, name }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/groups/{id}",
      tags: TAG,
      summary: "Xóa nhóm cùng thành viên và dữ liệu điểm danh (409 nếu còn nhóm con)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      if (!(await deleteGroup(group.id, user.userId))) fail(409, "has_children", "Hãy xóa các nhóm con bên trong trước.");
      return c.body(null, 204);
    },
  )

  // ---------- Thành viên ----------

  .openapi(
    createRoute({
      method: "get",
      path: "/groups/{id}/members",
      tags: MEMBER_TAG,
      summary: "Thành viên kèm tài khoản liên kết và tỷ lệ chuyên cần",
      security: AUTH,
      request: {
        params: IdParam,
        query: z.object({ sort: z.enum(["name", "rate"]).optional().describe("rate = chuyên cần thấp lên đầu") }),
      },
      responses: { 200: ok(MemberListSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const [members, rates] = await Promise.all([listMembers(group.id), getMemberRates(group.id)]);
      const accounts = await getAccountsByIds(members.map((m) => m.linkedUserId).filter((x): x is string => !!x));
      let list = members.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        linkedAccount: m.linkedUserId ? (accounts.get(m.linkedUserId) ?? null) : null,
        stats: rates.get(m.id) ?? { counts: {}, recorded: 0, rate: null },
      }));
      if (c.req.valid("query").sort === "rate") {
        // Chuyên cần thấp → cao; người chưa có kết quả ở cuối; cùng tỷ lệ giữ thứ tự tên
        list = [...list].sort((a, b) => {
          const ra = a.stats.rate;
          const rb = b.stats.rate;
          if (ra === null || rb === null) return ra === rb ? 0 : ra === null ? 1 : -1;
          return ra - rb;
        });
      }
      return c.json({ members: list }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups/{id}/members",
      tags: MEMBER_TAG,
      summary: "Thêm nhiều thành viên",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(AddMembersInput) },
      responses: { 201: ok(AddedSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const body = c.req.valid("json");
      // Dòng "Mã<Tab>Tên" hoặc "Tên"; bỏ dấu phẩy/xuống dòng trong tên để không bị tách nhầm
      const clean = (v: string) => v.replace(/[\t,\r\n]+/g, " ").trim();
      const text =
        body.text?.trim() ||
        (body.members ?? [])
          .map((m) => {
            const name = clean(m.name);
            const code = clean(m.code ?? "");
            return name ? (code ? `${code}\t${name}` : name) : "";
          })
          .filter(Boolean)
          .join("\n");
      if (!text) fail(422, "validation", "Chưa có tên thành viên nào.");
      return c.json({ added: await addMembersFromText(group.id, text) }, 201);
    },
  )

  // ---------- Buổi điểm danh ----------

  .openapi(
    createRoute({
      method: "get",
      path: "/groups/{id}/sessions",
      tags: SESSION_TAG,
      summary: "Các buổi điểm danh của nhóm kèm số Có mặt/Muộn/Vắng",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(SessionListSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const sessions = await listSessionsWithCounts(group.id);
      return c.json({ sessions: sessions.map((s) => ({ ...sessionOut(s), counts: s.counts })) }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups/{id}/sessions",
      tags: SESSION_TAG,
      summary: "Tạo buổi điểm danh",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(CreateSessionInput) },
      responses: { 201: ok(SessionSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      return c.json(sessionOut(await createSessionIn(group.id, user.userId, c.req.valid("json"))), 201);
    },
  )

  // ---------- Link tham gia nhóm (cách B) ----------

  .openapi(
    createRoute({
      method: "get",
      path: "/groups/{id}/invite",
      tags: TAG,
      summary: "Link tham gia nhóm đang bật (null nếu tắt)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(InviteLinkSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const invite = await getActiveGroupInvite(group.id);
      return c.json({ link: invite ? await buildShareLink(`/join/${invite.token}`, null) : null }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups/{id}/invite",
      tags: TAG,
      summary: "Bật link tham gia / tạo link mới (link cũ hết hiệu lực)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 201: ok(NewLinkSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const token = await createGroupInvite(group.id, user.userId);
      return c.json({ link: await buildShareLink(`/join/${token}`, null) }, 201);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/groups/{id}/invite",
      tags: TAG,
      summary: "Tắt link tham gia",
      security: AUTH,
      request: { params: IdParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      await disableGroupInvite(group.id);
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/groups/{id}/requests",
      tags: TAG,
      summary: "Yêu cầu liên kết đang chờ duyệt",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(LinkRequestListSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await ownedGroupOr404(c.req.valid("param").id, user.userId);
      const [requests, members] = await Promise.all([listPendingRequests(group.id), listMembers(group.id)]);
      const accounts = await getAccountsByIds(requests.map((r) => String(r.userId)));
      const names = new Map(members.map((m) => [m.id, m.name]));
      return c.json(
        {
          requests: requests.map((r) => ({
            id: String(r._id),
            account: accounts.get(String(r.userId)) ?? null,
            memberId: String(r.memberId),
            memberName: names.get(String(r.memberId)) ?? null,
            createdAt: iso(r.createdAt),
          })),
        },
        200,
      );
    },
  );
