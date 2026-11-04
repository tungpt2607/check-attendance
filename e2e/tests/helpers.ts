// Tiện ích cho kịch bản e2e: tạo dữ liệu nhanh qua API (không qua giao diện), đăng nhập trình duyệt bằng token.
import { expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";

export const API = "http://localhost:8787";
export const WEB = "http://localhost:3100";
export const GROUP_PAGE_TIMEOUT = 30_000;

export async function api<T = any>(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

export async function newOwner(name = "Chủ nhóm") {
  const email = `e2e_${randomBytes(4).toString("hex")}@test.local`;
  const r = await api<{ token: string; user: { id: string } }>("POST", "/v1/auth/register", { body: { name, email, password: "matkhau123" } });
  return { token: r.token, email, name };
}

/** Nhóm có sẵn thành viên và một buổi điểm danh */
export async function groupWithSession(token: string, names: string[]) {
  const g = await api<{ id: string }>("POST", "/v1/groups", { token, body: { name: `Lớp e2e ${randomBytes(2).toString("hex")}` } });
  await api("POST", `/v1/groups/${g.id}/members`, { token, body: { text: names.join("\n") } });
  const { members } = await api<{ members: { id: string; name: string }[] }>("GET", `/v1/groups/${g.id}/members`, { token });
  const s = await api<{ id: string }>("POST", `/v1/groups/${g.id}/sessions`, { token, body: { title: "Buổi e2e", date: "2026-11-04" } });
  return { groupId: g.id, sessionId: s.id, member: Object.fromEntries(members.map((m) => [m.name, m.id])) as Record<string, string> };
}

/** Đăng nhập trình duyệt: cookie phiên của web chính là token API */
export async function loginAs(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "ca_session", value: token, url: WEB }]);
}

export async function sessionRows(token: string, sessionId: string) {
  const s = await api<{ rows: { memberId: string; name: string; status: string | null; source: string | null }[] }>("GET", `/v1/sessions/${sessionId}`, { token });
  return Object.fromEntries(s.rows.map((r) => [r.name, r]));
}

export { expect };
