// /v1/notifications: thông báo của người đang đăng nhập (mọi loại, xem packages/shared/src/notifications.ts)
import { createRoute } from "@hono/zod-openapi";
import { MarkReadInput, NotificationListQuery, NotificationListSchema, UnreadCountSchema } from "@check-attendance/shared/api";
import { requireUser } from "../auth.js";
import { countUnread, listNotifications, markRead } from "../core/modules/notifications/notification.service.js";
import { getAccountsByIds } from "../core/modules/users/user.service.js";
import { AUTH, createApp, iso, jsonBody, NO_CONTENT, ok } from "../http.js";

const TAG = ["Thông báo"];
const DEFAULT_LIMIT = 20;

export const notifications = createApp()
  .openapi(
    createRoute({
      method: "get",
      path: "/notifications",
      tags: TAG,
      summary: "Thông báo của tôi, mới nhất trước (phân trang bằng cursor)",
      security: AUTH,
      request: { query: NotificationListQuery },
      responses: { 200: ok(NotificationListSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const { cursor, limit } = c.req.valid("query");
      const [{ items, nextCursor }, unreadCount] = await Promise.all([
        listNotifications(user.userId, cursor, limit ?? DEFAULT_LIMIT),
        countUnread(user.userId),
      ]);
      const actors = await getAccountsByIds(items.flatMap((n) => (n.actorId ? [String(n.actorId)] : [])));
      return c.json(
        {
          items: items.map((n) => ({
            id: String(n._id),
            type: n.type,
            groupId: n.groupId ? String(n.groupId) : null,
            actor: n.actorId ? (actors.get(String(n.actorId)) ?? null) : null,
            subject: n.subjectKind && n.subjectId ? { kind: n.subjectKind, id: String(n.subjectId) } : null,
            data: n.data ?? {},
            read: !!n.readAt,
            resolution: n.resolution ?? null,
            createdAt: iso(n.createdAt),
          })),
          nextCursor,
          unreadCount,
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/notifications/unread-count",
      tags: TAG,
      summary: "Số thông báo chưa đọc (nhẹ, dùng để hỏi định kỳ)",
      security: AUTH,
      responses: { 200: ok(UnreadCountSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      return c.json({ count: await countUnread(user.userId) }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/notifications/read",
      tags: TAG,
      summary: "Đánh dấu đã đọc (một số thông báo hoặc tất cả)",
      security: AUTH,
      request: jsonBody(MarkReadInput),
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const { ids, all } = c.req.valid("json");
      await markRead(user.userId, all ? "all" : (ids ?? []));
      return c.body(null, 204);
    },
  );
