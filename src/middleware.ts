import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-token";

/** Trang đăng nhập/đăng ký: đã đăng nhập thì chuyển vào trong */
const AUTH_PAGES = ["/login", "/register"];
/** Trang công khai không cần đăng nhập (vd. tự điểm danh bằng QR) */
const PUBLIC_PREFIXES = ["/checkin/", "/c/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/groups", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
