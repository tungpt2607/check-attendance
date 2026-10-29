import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-token";

/** Xoá phiên rồi về trang đăng nhập (kèm lý do nếu có, vd. không có quyền quản trị) */
export function GET(req: NextRequest) {
  const url = new URL("/login", req.url);
  const reason = req.nextUrl.searchParams.get("reason");
  if (reason) url.searchParams.set("error", reason);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
