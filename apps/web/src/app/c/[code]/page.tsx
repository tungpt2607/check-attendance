import { redirect } from "next/navigation";
import { decodeShortCode } from "@check-attendance/shared/short-code";

export const dynamic = "force-dynamic";

/** Link ngắn trong mã QR: giải mã rồi chuyển sang trang tự điểm danh đầy đủ. */
export default async function ShortCheckInLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = decodeShortCode(decodeURIComponent(code));
  if (!parsed) redirect("/login");
  redirect(`/checkin/${parsed.sessionId}?t=${encodeURIComponent(parsed.token)}`);
}
