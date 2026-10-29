// /v1/auth: đăng ký, đăng nhập · /v1/me: tài khoản của tôi · /v1/users/:id/avatar: ảnh đại diện
import { createRoute, z } from "@hono/zod-openapi";
import {
  AuthResultSchema,
  AvatarVersionSchema,
  FeaturesSchema,
  ForgotPasswordInput,
  LoginInput,
  NameInput,
  PasswordInput,
  PreferencesSchema,
  RegisterInput,
  ResetPasswordInput,
  ResetTokenInfoSchema,
  UpdatePreferencesInput,
  UserSchema,
} from "@check-attendance/shared/api";
import { ACCOUNT_DISABLED_MESSAGE, publicUser, requireUser, resolveRole } from "../auth.js";
import { signSession } from "../core/lib/auth-token.js";
import { runInBackground } from "../core/lib/background.js";
import { emailConfigured } from "../core/lib/mailer.js";
import { sendPasswordReset } from "../core/modules/auth/password-reset.service.js";
import { consumeOneTimeToken, peekOneTimeToken, revokeTokens } from "../core/modules/tokens/one-time-token.service.js";
import {
  changePassword,
  createUser,
  findUserByEmail,
  getAccount,
  getPreferences,
  getUserAvatar,
  removeUserAvatar,
  resetPassword,
  setUserAvatar,
  updatePreferences,
  updateUserName,
  verifyPassword,
} from "../core/modules/users/user.service.js";
import { AUTH, createApp, fail, IdParam, jsonBody, NO_CONTENT, notFound, ok, PUBLIC, TokenParam } from "../http.js";

const TAG = ["Tài khoản"];
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Ảnh đã được cắt và thu nhỏ trên thiết bị (1024px), thường 150–400KB */
const AVATAR_MAX_BYTES = 600 * 1024;

/** Cấp token mới cho tài khoản (đăng nhập, đăng ký, đổi mật khẩu) */
async function issue(userId: string) {
  const acc = await getAccount(userId);
  if (!acc) return notFound("tài khoản");
  const token = await signSession({ userId: acc.id, name: acc.name, tv: acc.tokenVersion });
  return {
    token,
    user: { id: acc.id, name: acc.name, email: acc.email, avatarVersion: acc.avatarVersion, role: resolveRole(acc) },
  };
}

export const account = createApp()
  .openapi(
    createRoute({
      method: "post",
      path: "/auth/register",
      tags: TAG,
      summary: "Đăng ký, trả token",
      security: PUBLIC,
      request: jsonBody(RegisterInput),
      responses: { 201: ok(AuthResultSchema) },
    }),
    async (c) => {
      const { name, email, password } = c.req.valid("json");
      if (await findUserByEmail(email)) fail(409, "email_taken", "Email này đã được đăng ký.");
      const user = await createUser({ name, email, password });
      return c.json(await issue(user.id), 201);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/auth/login",
      tags: TAG,
      summary: "Đăng nhập, trả token",
      security: PUBLIC,
      request: jsonBody(LoginInput),
      responses: { 200: ok(AuthResultSchema) },
    }),
    async (c) => {
      const { email, password } = c.req.valid("json");
      const user = await findUserByEmail(email);
      if (!user || !(await verifyPassword(user, password))) fail(401, "wrong_credentials", "Email hoặc mật khẩu không đúng.");
      if (user.disabledAt) fail(403, "account_disabled", ACCOUNT_DISABLED_MESSAGE);
      return c.json(await issue(String(user._id)), 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/features",
      tags: TAG,
      summary: "Tính năng đang bật trên máy chủ (vd. gửi email)",
      security: PUBLIC,
      responses: { 200: ok(FeaturesSchema) },
    }),
    (c) => c.json({ email: emailConfigured() }, 200),
  )

  // ---------- Quên mật khẩu ----------

  // Luôn trả cùng một kết quả (không lộ email nào đã đăng ký); việc gửi email chạy phía sau
  .openapi(
    createRoute({
      method: "post",
      path: "/auth/password-reset",
      tags: TAG,
      summary: "Quên mật khẩu: gửi link đặt lại qua email (luôn trả 202, kể cả email chưa đăng ký)",
      security: PUBLIC,
      request: jsonBody(ForgotPasswordInput),
      responses: { 202: { description: "Đã nhận yêu cầu" } },
    }),
    async (c) => {
      if (!emailConfigured()) fail(503, "email_unavailable", "Chức năng gửi email chưa được bật. Vui lòng liên hệ quản trị viên.");
      const { email } = c.req.valid("json");
      runInBackground("password_reset", () => sendPasswordReset(email));
      return c.body(null, 202);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/auth/password-reset/{token}",
      tags: TAG,
      summary: "Kiểm tra link đặt lại mật khẩu còn dùng được không (404 = hết hạn hoặc đã dùng)",
      security: PUBLIC,
      request: { params: TokenParam },
      responses: { 200: ok(ResetTokenInfoSchema) },
    }),
    async (c) => {
      const userId = await peekOneTimeToken(c.req.valid("param").token, "password_reset");
      const acc = userId ? await getAccount(userId) : null;
      if (!acc) fail(404, "invalid_reset_token", "Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng.");
      return c.json({ email: acc!.email }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/auth/password-reset/confirm",
      tags: TAG,
      summary: "Đặt mật khẩu mới bằng link trong email (mọi phiên đăng nhập cũ hết hiệu lực)",
      security: PUBLIC,
      request: jsonBody(ResetPasswordInput),
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const { token, password } = c.req.valid("json");
      const userId = await consumeOneTimeToken(token, "password_reset");
      if (!userId || !(await resetPassword(userId, password))) {
        fail(404, "invalid_reset_token", "Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng.");
      }
      await revokeTokens(userId!, "password_reset");
      return c.body(null, 204);
    },
  )

  // Token không lưu trên máy chủ: đăng xuất là client xóa token. Muốn hủy mọi phiên thì đổi mật khẩu.
  .openapi(
    createRoute({
      method: "post",
      path: "/auth/logout",
      tags: TAG,
      summary: "Đăng xuất (client tự xóa token)",
      security: PUBLIC,
      responses: { 204: NO_CONTENT },
    }),
    (c) => c.body(null, 204),
  )

  .openapi(
    createRoute({ method: "get", path: "/me", tags: TAG, summary: "Thông tin tài khoản của tôi", security: AUTH, responses: { 200: ok(UserSchema) } }),
    (c) => c.json(publicUser(requireUser(c)), 200),
  )

  .openapi(
    createRoute({
      method: "patch",
      path: "/me",
      tags: TAG,
      summary: "Đổi họ tên",
      security: AUTH,
      request: jsonBody(NameInput),
      responses: { 200: ok(UserSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const { name } = c.req.valid("json");
      await updateUserName(user.userId, name);
      return c.json({ ...publicUser(user), name }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/me/preferences",
      tags: TAG,
      summary: "Cài đặt cá nhân (nhận email thông báo...)",
      security: AUTH,
      responses: { 200: ok(PreferencesSchema) },
    }),
    async (c) => c.json(await getPreferences(requireUser(c).userId), 200),
  )

  .openapi(
    createRoute({
      method: "patch",
      path: "/me/preferences",
      tags: TAG,
      summary: "Đổi cài đặt cá nhân (chỉ gửi trường cần đổi)",
      security: AUTH,
      request: jsonBody(UpdatePreferencesInput),
      responses: { 200: ok(PreferencesSchema) },
    }),
    async (c) => c.json(await updatePreferences(requireUser(c).userId, c.req.valid("json")), 200),
  )

  .openapi(
    createRoute({
      method: "put",
      path: "/me/avatar",
      tags: TAG,
      summary: "Tải ảnh đại diện (multipart, trường avatar; JPEG/PNG/WebP ≤ 600KB, đã cắt vuông)",
      security: AUTH,
      request: {
        body: {
          content: { "multipart/form-data": { schema: z.object({ avatar: z.any().describe("File ảnh") }) } },
          required: true,
        },
      },
      responses: { 200: ok(AvatarVersionSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const file: unknown = c.req.valid("form").avatar;
      if (!(file instanceof File) || file.size === 0) fail(422, "validation", "Chưa chọn ảnh.");
      const f = file as File;
      if (!AVATAR_TYPES.includes(f.type)) fail(415, "unsupported_type", "Định dạng ảnh không hỗ trợ.");
      if (f.size > AVATAR_MAX_BYTES) fail(413, "too_large", "Ảnh quá lớn.");
      await setUserAvatar(user.userId, Buffer.from(await f.arrayBuffer()), f.type);
      const acc = await getAccount(user.userId);
      return c.json({ avatarVersion: acc?.avatarVersion ?? null }, 200);
    },
  )

  .openapi(
    createRoute({ method: "delete", path: "/me/avatar", tags: TAG, summary: "Xóa ảnh đại diện", security: AUTH, responses: { 204: NO_CONTENT } }),
    async (c) => {
      const user = requireUser(c);
      await removeUserAvatar(user.userId);
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/me/password",
      tags: TAG,
      summary: "Đổi mật khẩu, trả token mới (mọi token cũ hết hiệu lực)",
      security: AUTH,
      request: jsonBody(PasswordInput),
      responses: { 200: ok(AuthResultSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const { current, next } = c.req.valid("json");
      if (next === current) fail(422, "validation", "Mật khẩu mới phải khác mật khẩu hiện tại.");
      const tv = await changePassword(user.userId, current, next);
      if (tv === null) fail(422, "wrong_password", "Mật khẩu hiện tại không đúng.");
      return c.json(await issue(user.userId), 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/users/{id}/avatar",
      tags: TAG,
      summary: "Ảnh đại diện (công khai; thêm ?v=avatarVersion để lưu đệm lâu dài)",
      security: PUBLIC,
      request: { params: IdParam },
      responses: { 200: { description: "Ảnh (image/jpeg, image/png hoặc image/webp)" } },
    }),
    async (c) => {
      const avatar = await getUserAvatar(c.req.valid("param").id);
      if (!avatar) return notFound("ảnh");
      return c.body(new Uint8Array(avatar.data), 200, {
        "Content-Type": avatar.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    },
  );
