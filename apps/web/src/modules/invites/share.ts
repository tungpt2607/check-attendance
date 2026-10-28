import { makeQrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/url";

export type ShareLink = { url: string; qrDataUrl: string; expiresAt: string | null };

/** Dựng link đầy đủ + mã QR để chia sẻ */
export async function buildShareLink(path: string, expiresAt: Date | null): Promise<ShareLink> {
  const url = `${await getBaseUrl()}${path}`;
  return { url, qrDataUrl: await makeQrDataUrl(url), expiresAt: expiresAt ? expiresAt.toISOString() : null };
}
