import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceFilter } from "@/components/attendance-filter";
import { SubmitButton } from "@/components/submit-button";
import { normalizeSearch } from "@/lib/search";
import { ui } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { deleteSessionAction, saveAttendanceAction } from "@/modules/attendance/attendance.actions";
import { getAttendanceSession, getSessionRecords } from "@/modules/attendance/attendance.service";
import { ATTENDANCE_STATUSES, DEFAULT_STATUS } from "@/modules/attendance/attendance.statuses";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { listMembers } from "@/modules/members/member.service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function AttendanceSessionPage({ params, searchParams }: Props) {
  const { groupId, sessionId } = await params;
  const { saved } = await searchParams;
  const user = await requireUser();

  const group = await getOwnedGroup(groupId, user.userId);
  const session = group ? await getAttendanceSession(sessionId) : null;
  if (!group || !session || session.groupId !== group.id) notFound();

  const [members, records] = await Promise.all([listMembers(group.id), getSessionRecords(session.id)]);
  const isNew = records.size === 0;

  const counts = new Map<string, number>();
  for (const r of records.values()) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/groups/${group.id}`} className="hover:text-indigo-600">← {group.name}</Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{session.title}</h1>
          <p className={ui.muted}>{formatDate(session.date)} · {members.length} thành viên</p>
        </div>
        <form action={deleteSessionAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <SubmitButton variant="danger" pendingText="Đang xóa..." confirm="Xóa buổi điểm danh này?">
            Xóa buổi
          </SubmitButton>
        </form>
      </div>

      {saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Đã lưu kết quả điểm danh.</p>
      )}

      {!isNew && (
        <div className="flex flex-wrap gap-2">
          {ATTENDANCE_STATUSES.map((st) => (
            <span key={st.value} className={`rounded-lg px-3 py-1 text-sm font-medium ${st.className}`}>
              {st.label}: {counts.get(st.value) ?? 0}
            </span>
          ))}
        </div>
      )}

      {members.length === 0 ? (
        <div className={ui.card}>
          <p className={ui.muted}>Nhóm chưa có thành viên.</p>
        </div>
      ) : (
        <form action={saveAttendanceAction} className={`${ui.card} p-0`}>
          <input type="hidden" name="sessionId" value={session.id} />
          {isNew && (
            <p className="border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
              Mặc định tất cả <b>Vắng</b>. Chọn <b>Có mặt</b> hoặc <b>Muộn</b> cho những người đã đến rồi bấm Lưu.
            </p>
          )}
          <AttendanceFilter listId="attendance-list" />
          <ul id="attendance-list" className="divide-y divide-slate-100">
            {members.map((m, i) => {
              const current = records.get(m.id);
              const status = current?.status ?? DEFAULT_STATUS;
              return (
                <li
                  key={m.id}
                  data-member={m.id}
                  data-search={normalizeSearch(`${m.name} ${m.code}`)}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
                    {m.code && <span className="mr-2 text-xs text-slate-500">{m.code}</span>}
                    <span className="font-medium">{m.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-slate-200">
                      {ATTENDANCE_STATUSES.map((st) => (
                        <label
                          key={st.value}
                          className={`cursor-pointer border-r border-slate-200 px-3 py-1.5 text-sm last:border-r-0 hover:bg-slate-50 has-checked:font-semibold ${st.checkedClass}`}
                        >
                          <input
                            type="radio"
                            name={`status_${m.id}`}
                            value={st.value}
                            defaultChecked={st.value === status}
                            className="sr-only"
                          />
                          {st.label}
                        </label>
                      ))}
                    </div>
                    <input
                      name={`note_${m.id}`}
                      defaultValue={current?.note ?? ""}
                      placeholder="Ghi chú"
                      className={`${ui.input} sm:w-36`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-0 flex justify-end border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
            <SubmitButton pendingText="Đang lưu...">Lưu điểm danh</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
