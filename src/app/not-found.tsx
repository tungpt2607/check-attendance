import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy</h1>
      <p className="mt-2 text-sm text-slate-500">Trang không tồn tại hoặc bạn không có quyền truy cập.</p>
      <Link href="/groups" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
        Về danh sách nhóm
      </Link>
    </div>
  );
}
