import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-token";

/** Trang đăng nhập/đăng ký: đã đăng nhập thì chuyển vào trong */
const AUTH_PAGES = ["/login", "/register"];
/** Trang công khai không cần đăng nhập (vd. tự điểm danh bằng QR, quên mật khẩu) */
const PUBLIC_PREFIXES = ["/checkin/", "/c/", "/api/avatar/", "/forgot-password", "/reset-password/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!session && !isAuthPage) {
    const login = new URL("/login", req.url);
    // Đăng nhập xong quay lại đúng trang (vd. link mời)
    if (pathname !== "/" && pathname !== "/groups") login.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (session && isAuthPage) {
    const next = req.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/groups";
    return NextResponse.redirect(new URL(target, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
