// /v1/auth: đăng ký, đăng nhập · /v1/me: tài khoản của tôi · /v1/users/:id/avatar: ảnh đại diện
import { Hono } from "hono";
import { publicUser, requireUser, type AppEnv } from "../auth.js";
import { signSession } from "../core/lib/auth-token.js";
import { isValidId } from "../core/lib/db.js";
import {
  changePassword,
  createUser,
  findUserByEmail,
  getAccount,
  getUserAvatar,
  removeUserAvatar,
  setUserAvatar,
  updateUserName,
  verifyPassword,
} from "../core/modules/users/user.service.js";
import { fail, notFound, readJson, requiredStr, str } from "../http.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Ảnh đã được cắt và thu nhỏ trên thiết bị (1024px), thường 150–400KB */
const AVATAR_MAX_BYTES = 600 * 1024;

async function issue(userId: string) {
  const acc = await getAccount(userId);
  if (!acc) return notFound("tài khoản");
  const token = await signSession({ userId: acc.id, name: acc.name, tv: acc.tokenVersion });
  return {
    token,
    user: { id: acc.id, name: acc.name, email: acc.email, avatarVersion: acc.avatarVersion, role: acc.role },
  };
}

export const account = new Hono<AppEnv>()
  .post("/auth/register", async (c) => {
    const body = await readJson(c);
    const name = requiredStr(body, "name", "họ tên", 80);
    const email = str(body, "email").toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email)) fail(422, "validation", "Email không hợp lệ.");
    if (password.length < 6) fail(422, "validation", "Mật khẩu phải có ít nhất 6 ký tự.");
    if (await findUserByEmail(email)) fail(409, "email_taken", "Email này đã được đăng ký.");
    const user = await createUser({ name, email, password });
    return c.json(await issue(user.id), 201);
  })

  .post("/auth/login", async (c) => {
    const body = await readJson(c);
    const email = str(body, "email").toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) fail(422, "validation", "Vui lòng nhập email và mật khẩu.");
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(user, password))) fail(401, "wrong_credentials", "Email hoặc mật khẩu không đúng.");
    return c.json(await issue(String(user!._id)));
  })

  // Token không lưu trên máy chủ: đăng xuất là client xóa token. Muốn hủy mọi phiên thì đổi mật khẩu.
  .post("/auth/logout", (c) => c.body(null, 204))

  .get("/me", (c) => c.json(publicUser(requireUser(c))))

  .patch("/me", async (c) => {
    const user = requireUser(c);
    const body = await readJson(c);
    const name = requiredStr(body, "name", "họ tên", 80);
    await updateUserName(user.userId, name);
    return c.json({ ...publicUser(user), name });
  })

  /** Gửi multipart/form-data, trường "avatar" là file ảnh đã cắt vuông */
  .put("/me/avatar", async (c) => {
    const user = requireUser(c);
    const form = await c.req.parseBody();
    const file = form["avatar"];
    if (!(file instanceof File) || file.size === 0) fail(422, "validation", "Chưa chọn ảnh.");
    const f = file as File;
    if (!AVATAR_TYPES.includes(f.type)) fail(415, "unsupported_type", "Định dạng ảnh không hỗ trợ.");
    if (f.size > AVATAR_MAX_BYTES) fail(413, "too_large", "Ảnh quá lớn.");
    await setUserAvatar(user.userId, Buffer.from(await f.arrayBuffer()), f.type);
    const acc = await getAccount(user.userId);
    return c.json({ avatarVersion: acc?.avatarVersion ?? null });
  })

  .delete("/me/avatar", async (c) => {
    const user = requireUser(c);
    await removeUserAvatar(user.userId);
    return c.body(null, 204);
  })

  /** Đổi mật khẩu: trả token mới; mọi token cũ (thiết bị khác) hết hiệu lực */
  .post("/me/password", async (c) => {
    const user = requireUser(c);
    const body = await readJson(c);
    const current = typeof body.current === "string" ? body.current : "";
    const next = typeof body.next === "string" ? body.next : "";
    if (!current) fail(422, "validation", "Vui lòng nhập mật khẩu hiện tại.");
    if (next.length < 6) fail(422, "validation", "Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (next === current) fail(422, "validation", "Mật khẩu mới phải khác mật khẩu hiện tại.");
    const tv = await changePassword(user.userId, current, next);
    if (tv === null) fail(422, "wrong_password", "Mật khẩu hiện tại không đúng.");
    return c.json(await issue(user.userId));
  })

  /** Ảnh đại diện (công khai). Thêm ?v=<avatarVersion> để trình duyệt lưu đệm lâu dài. */
  .get("/users/:id/avatar", async (c) => {
    const id = c.req.param("id");
    const avatar = isValidId(id) ? await getUserAvatar(id) : null;
    if (!avatar) return notFound("ảnh");
    return c.body(new Uint8Array(avatar!.data), 200, {
      "Content-Type": avatar!.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });
