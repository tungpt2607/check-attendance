import { NextResponse, type NextRequest } from "next/server";
import { avatarUrl } from "@/lib/api-url";

/** Đường dẫn ảnh cũ: chuyển sang ảnh đại diện trên API (ảnh giờ do API phục vụ) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const v = Number(req.nextUrl.searchParams.get("v")) || 1;
  return NextResponse.redirect(avatarUrl(userId, v), 308);
}
