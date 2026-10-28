// Tiện ích chung cho các route: lỗi chuẩn, đọc body, kiểm tra dữ liệu đầu vào.
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { isValidId } from "./core/lib/db.js";

/** Mã lỗi máy đọc được (để app/CMS xử lý) kèm câu báo lỗi tiếng Việt (để hiện cho người dùng) */
export type ErrorBody = { error: { code: string; message: string } };

export function fail(status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 415 | 422 | 429, code: string, message: string): never {
  const body: ErrorBody = { error: { code, message } };
  throw new HTTPException(status, { res: Response.json(body, { status }) });
}

export const notFound = (what = "dữ liệu"): never => fail(404, "not_found", `Không tìm thấy ${what}.`);

/** Đọc body JSON; body hỏng thì báo lỗi 400 */
export async function readJson(c: Context): Promise<Record<string, unknown>> {
  try {
    const data = await c.req.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return fail(400, "invalid_json", "Dữ liệu gửi lên không phải JSON hợp lệ.");
  }
}

/** Lấy chuỗi (đã cắt khoảng trắng); thiếu thì trả "" */
export function str(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** Chuỗi bắt buộc, có giới hạn độ dài */
export function requiredStr(body: Record<string, unknown>, key: string, label: string, max = 200): string {
  const v = str(body, key);
  if (!v) fail(422, "validation", `Vui lòng nhập ${label}.`);
  if (v.length > max) fail(422, "validation", `${label[0].toUpperCase()}${label.slice(1)} quá dài.`);
  return v;
}

/** Tham số id trên đường dẫn phải là ObjectId hợp lệ */
export function idParam(c: Context, name: string, what: string): string {
  const id = c.req.param(name);
  if (!isValidId(id)) notFound(what);
  return id as string;
}
