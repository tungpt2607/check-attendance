// Mẫu email dùng chung (màu OPES). Mọi email dựng qua renderEmail() để giống nhau.
import { webUrl } from "./share.js";

/** Đoạn chữ; bold = in đậm (giống TextPart của thông báo) */
export type EmailText = string | { text: string; bold?: boolean }[];

export type EmailContent = {
  /** Dòng tiêu đề lớn trong email */
  heading: string;
  /** Các đoạn văn */
  paragraphs: EmailText[];
  /** Nút bấm chính */
  button?: { label: string; url: string };
  /** Dòng chữ nhỏ cuối email (vd. link hết hạn sau 30 phút) */
  note?: string;
};

const C = { teal: "#2A7F82", ink: "#404447", muted: "#6B7075", bg: "#F6F8F8", border: "#E2E6E7" };
const STRIPE = ["#E69842", "#404447", "#54B6B9", "#982726"];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

function toHtml(t: EmailText): string {
  return typeof t === "string" ? esc(t) : t.map((p) => (p.bold ? `<b>${esc(p.text)}</b>` : esc(p.text))).join("");
}

function toText(t: EmailText): string {
  return typeof t === "string" ? t : t.map((p) => p.text).join("");
}

/** Dựng email (HTML + chữ thường cho ứng dụng mail không hiện HTML) */
export function renderEmail(c: EmailContent): { html: string; text: string } {
  const stripe = STRIPE.map((col) => `<td style="height:4px;background:${col}"></td>`).join("");
  const paragraphs = c.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${C.ink}">${toHtml(p)}</p>`)
    .join("");
  const button = c.button
    ? `<p style="margin:22px 0"><a href="${esc(c.button.url)}" style="display:inline-block;background:${C.teal};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${esc(c.button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:${C.muted}">Nếu nút không bấm được, mở link này:<br><a href="${esc(c.button.url)}" style="color:${C.teal};word-break:break-all">${esc(c.button.url)}</a></p>`
    : "";
  const note = c.note ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:${C.muted}">${esc(c.note)}</p>` : "";

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${C.border};border-radius:14px;overflow:hidden">
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${stripe}</tr></table></td></tr>
<tr><td style="padding:24px 24px 8px;font-size:17px;font-weight:700;color:${C.ink}">Điểm danh</td></tr>
<tr><td style="padding:8px 24px 24px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:${C.ink}">${esc(c.heading)}</h1>
${paragraphs}${button}${note}
</td></tr></table>
<p style="max-width:520px;margin:14px auto 0;font-size:12px;line-height:1.5;color:${C.muted};text-align:center">Email tự động từ <a href="${esc(webUrl())}" style="color:${C.muted}">Điểm danh</a>. Vui lòng không trả lời email này.</p>
</td></tr></table></body></html>`;

  const text = [
    c.heading,
    "",
    ...c.paragraphs.map(toText),
    ...(c.button ? ["", `${c.button.label}: ${c.button.url}`] : []),
    ...(c.note ? ["", c.note] : []),
    "",
    "— Điểm danh (email tự động, vui lòng không trả lời)",
  ].join("\n");

  return { html, text };
}
