// Tiện ích chung cho các route: tạo app có kiểm tra dữ liệu (zod), lỗi chuẩn, mô tả tài liệu.
import { OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./auth.js";

/** Mã lỗi máy đọc được (để app/CMS xử lý) kèm câu báo lỗi tiếng Việt (để hiện cho người dùng) */
export type ErrorBody = { error: { code: string; message: string } };

export function fail(status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 415 | 422 | 429 | 503, code: string, message: string): never {
  const body: ErrorBody = { error: { code, message } };
  throw new HTTPException(status, { res: Response.json(body, { status }) });
}

export function notFound(what = "dữ liệu"): never {
  return fail(404, "not_found", `Không tìm thấy ${what}.`);
}

/**
 * App con có kiểm tra dữ liệu gửi lên theo schema.
 * Dữ liệu sai: trả 422 kèm câu báo lỗi đầu tiên; mã trên đường dẫn sai: trả 404 (như không tìm thấy).
 */
export function createApp() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (result.success) return;
      if (result.target === "param") notFound();
      const issue = result.error.issues[0];
      fail(422, "validation", issue?.message || "Dữ liệu không hợp lệ.");
    },
  });
}

// ---------- Mô tả route cho tài liệu ----------

type Security = { [scheme: string]: string[] }[];
/** Cần đăng nhập (Bearer token) */
export const AUTH: Security = [{ Bearer: [] }];
/** Có token thì dùng, không có cũng được */
export const OPTIONAL_AUTH: Security = [{}, { Bearer: [] }];
/** Công khai */
export const PUBLIC: Security = [];

/** Phản hồi JSON thành công */
export function ok<T extends z.ZodType>(schema: T, description = "Thành công") {
  return { content: { "application/json": { schema } }, description };
}

/** Body JSON gửi lên */
export function jsonBody<T extends z.ZodType>(schema: T) {
  return { body: { content: { "application/json": { schema } }, required: true } };
}

export const NO_CONTENT = { description: "Thành công, không có nội dung" };

/** Tham số trên đường dẫn */
const ObjectIdStr = z.string().regex(/^[a-f0-9]{24}$/i);
export const IdParam = z.object({ id: ObjectIdStr });
export const SessionIdParam = z.object({ sessionId: ObjectIdStr });
export const MemberIdParam = z.object({ memberId: ObjectIdStr });
export const TokenParam = z.object({ token: z.string().min(1).max(64) });

/** Date → chuỗi ISO (schema API dùng chuỗi) */
export function iso(d: Date | string): string;
export function iso(d: Date | string | null | undefined): string | null;
export function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return typeof d === "string" ? d : d.toISOString();
}
