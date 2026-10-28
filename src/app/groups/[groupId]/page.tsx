import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/components/ui";
import { formatDate, todayInputValue } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { createSessionAction } from "@/modules/attendance/attendance.actions";
import { listSessionsWithCounts } from "@/modules/attendance/attendance.service";
import { ATTENDANCE_STATUSES } from "@/modules/attendance/attendance.statuses";
import { createGroupAction, deleteGroupAction, renameGroupAction } from "@/modules/groups/group.actions";
import { getAncestors, getChildGroups, getOwnedGroup } from "@/modules/groups/group.service";
import { addMembersAction, deleteMemberAction, updateMemberAction } from "@/modules/members/member.actions";
import { listMembers } from "@/modules/members/member.service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await getOwnedGroup(groupId, user.userId);
  if (!group) notFound();

  const [ancestors, children, members, sessions] = await Promise.all([
    getAncestors(group, user.userId),
    getChildGroups(group.id, user.userId),
    listMembers(group.id),
    listSessionsWithCounts(group.id),
  ]);

  return (
    <div className="space-y-6">
      {/* Đường dẫn nhóm */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href="/groups" className="hover:text-indigo-600">Nhóm của tôi</Link>
        {ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <span>/</span>
            <Link href={`/groups/${a.id}`} className="hover:text-indigo-600">{a.name}</Link>
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className={ui.muted}>
            {members.length} thành viên · {children.length} nhóm con · {sessions.length} buổi điểm danh
          </p>
        </div>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className={`${ui.btnGhost} cursor-pointer list-none`}>Đổi tên</summary>
            <form action={renameGroupAction} className="absolute right-0 z-10 mt-2 flex w-72 gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <input type="hidden" name="groupId" value={group.id} />
              <input name="name" defaultValue={group.name} required className={ui.input} />
              <SubmitButton pendingText="...">Lưu</SubmitButton>
            </form>
          </details>
          {children.length === 0 && (
            <form action={deleteGroupAction}>
              <input type="hidden" name="groupId" value={group.id} />
              <SubmitButton
                variant="danger"
                pendingText="Đang xóa..."
                confirm={`Xóa nhóm "${group.name}" cùng toàn bộ thành viên và dữ liệu điểm danh?`}
              >
                Xóa nhóm
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {/* Điểm danh */}
      <section className={ui.card}>
        <h2 className={`${ui.h2} mb-3`}>Điểm danh</h2>
        {members.length === 0 ? (
          <p className={ui.muted}>Thêm thành viên trước khi điểm danh.</p>
        ) : (
          <form action={createSessionAction} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="groupId" value={group.id} />
            <input name="title" placeholder="Tên buổi (vd: Buổi sáng, Tiết 1...)" className={ui.input} />
            <input name="date" type="date" required defaultValue={todayInputValue()} className={`${ui.input} min-w-0 appearance-none sm:w-44`} />
            <SubmitButton pendingText="Đang tạo..." className="shrink-0">Bắt đầu điểm danh</SubmitButton>
          </form>
        )}

        {sessions.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/groups/${group.id}/sessions/${s.id}`}
                  className="flex flex-col items-start gap-1.5 py-2.5 hover:text-indigo-600"
                >
                  <span>
                    <span className="font-medium">{s.title}</span>
                    <span className="ml-2 text-sm text-slate-500">{formatDate(s.date)}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {ATTENDANCE_STATUSES.map((st) => (
                      <span key={st.value} className={`rounded-md px-2 py-0.5 text-xs font-medium ${st.className}`}>
                        {st.short} {s.counts[st.value] ?? 0}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Thành viên */}
        <section className={ui.card}>
          <h2 className={`${ui.h2} mb-3`}>Thành viên ({members.length})</h2>
          {members.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100">
              {members.map((m, i) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
                    {m.code && <span className="mr-2 text-xs text-slate-500">{m.code}</span>}
                    {m.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Sửa</summary>
                      <form action={updateMemberAction} className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                        <input type="hidden" name="memberId" value={m.id} />
                        <input name="name" defaultValue={m.name} required placeholder="Họ tên" className={ui.input} />
                        <input name="code" defaultValue={m.code} placeholder="Mã số (tùy chọn)" className={ui.input} />
                        <SubmitButton pendingText="..." className="w-full">Lưu</SubmitButton>
                      </form>
                    </details>
                    <form action={deleteMemberAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button
                        type="submit"
                        className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
                        title="Xóa thành viên"
                      >
                        Xóa
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={addMembersAction} className="space-y-2">
            <input type="hidden" name="groupId" value={group.id} />
            <label className={ui.label} htmlFor="members">Thêm thành viên</label>
            <textarea
              id="members"
              name="members"
              rows={4}
              required
              placeholder={"Mỗi dòng một người, ví dụ:\nNguyễn Văn An\nHS002, Trần Thị Bình"}
              className={ui.input}
            />
            <p className="text-xs text-slate-500">Có thể dán từ Excel: cột Mã và cột Tên.</p>
            <SubmitButton pendingText="Đang thêm...">Thêm</SubmitButton>
          </form>
        </section>

        {/* Nhóm con */}
        <section className={ui.card}>
          <h2 className={`${ui.h2} mb-3`}>Nhóm con ({children.length})</h2>
          {children.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100">
              {children.map((c) => (
                <li key={c.id}>
                  <Link href={`/groups/${c.id}`} className="block py-2 font-medium hover:text-indigo-600">
                    ↳ {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <form action={createGroupAction} className="flex gap-2">
            <input type="hidden" name="parentId" value={group.id} />
            <input name="name" required placeholder="Tên nhóm con" className={ui.input} />
            <SubmitButton pendingText="..." className="shrink-0">Tạo</SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
