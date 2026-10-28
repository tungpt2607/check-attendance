import { getUserAvatar } from "@/modules/users/user.service";

export const dynamic = "force-dynamic";

/** Trả ảnh đại diện. Link luôn kèm ?v=<phiên bản> nên trình duyệt được lưu đệm lâu dài. */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const avatar = await getUserAvatar(userId);
  if (!avatar) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
