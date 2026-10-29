// Mã dùng 1 lần (gửi trong link qua email): tạo, kiểm tra, dùng, thu hồi.
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../../lib/db.js";
import { OneTimeToken, type OneTimeTokenRecord, type TokenPurpose } from "./one-time-token.model.js";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Tạo mã mới, trả về mã gốc (chỉ gửi qua email, không lưu) */
export async function createOneTimeToken(userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
  await connectDB();
  const raw = randomBytes(32).toString("base64url");
  await OneTimeToken.create({
    userId: new mongoose.Types.ObjectId(userId),
    purpose,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return raw;
}

/** Số mã đã tạo trong khoảng thời gian gần đây (giới hạn số lần yêu cầu) */
export async function countRecentTokens(userId: string, purpose: TokenPurpose, withinMs: number): Promise<number> {
  await connectDB();
  return OneTimeToken.countDocuments({ userId, purpose, createdAt: { $gt: new Date(Date.now() - withinMs) } });
}

/** Mã còn dùng được không (chưa dùng, chưa hết hạn); trả về id tài khoản */
export async function peekOneTimeToken(raw: string, purpose: TokenPurpose): Promise<string | null> {
  await connectDB();
  const t = await OneTimeToken.findOne({
    tokenHash: hashToken(raw),
    purpose,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean<OneTimeTokenRecord>();
  return t ? String(t.userId) : null;
}

/** Dùng mã (chỉ thành công 1 lần); trả về id tài khoản */
export async function consumeOneTimeToken(raw: string, purpose: TokenPurpose): Promise<string | null> {
  await connectDB();
  const t = await OneTimeToken.findOneAndUpdate(
    { tokenHash: hashToken(raw), purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  ).lean<OneTimeTokenRecord>();
  return t ? String(t.userId) : null;
}

/** Thu hồi mọi mã chưa dùng của tài khoản cho mục đích này */
export async function revokeTokens(userId: string, purpose: TokenPurpose): Promise<void> {
  await connectDB();
  await OneTimeToken.updateMany({ userId, purpose, usedAt: null }, { $set: { usedAt: new Date() } });
}
