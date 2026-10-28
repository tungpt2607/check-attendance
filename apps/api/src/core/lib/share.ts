import { makeQrDataUrl } from "./qr.js";

export type ShareLink = { url: string; qrDataUrl: string; expiresAt: string | null };

/** Địa chỉ web người dùng: link mời, link QR đều trỏ về đây */
export function webUrl(): string {
  return (process.env.WEB_URL || "https://check-attendance-pi.vercel.app").replace(/\/+$/, "");
}

/** Dựng link đầy đủ (trên web người dùng) + mã QR để chia sẻ */
export async function buildShareLink(path: string, expiresAt: Date | null): Promise<ShareLink> {
  const url = `${webUrl()}${path}`;
  return { url, qrDataUrl: await makeQrDataUrl(url), expiresAt: expiresAt ? expiresAt.toISOString() : null };
}
