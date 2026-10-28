import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceFilter } from "@/components/attendance-filter";
import { SubmitButton } from "@/components/submit-button";
import { normalizeSearch } from "@/lib/search";
import { ui } from "@/components/ui";
import { dateInputValue, formatDate, formatTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import {
  closeSelfCheckInAction,
  deleteSessionAction,
  openSelfCheckInAction,
  saveAttendanceAction,
  updateSessionAction,
} from "@/modules/attendance/attendance.actions";
import { getAttendanceSession, getSessionRecords } from "@/modules/attendance/attendance.service";
import { ATTENDANCE_STATUSES, DEFAULT_STATUS } from "@/modules/attendance/attendance.statuses";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { listMembers } from "@/modules/members/member.service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function AttendanceSessionPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const user = await requireUser();

  const group = await getOwnedGroup(groupId, user.userId);
  const session = group ? await getAttendanceSession(sessionId) : null;
  if (!group || !session || session.groupId !== group.id) notFound();

  const [members, records] = await Promise.all([listMembers(group.id), getSessionRecords(session.id)]);
  const isNew = records.size === 0;


  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/groups/${group.id}`} className="hover:text-brand-600">← {group.name}</Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{session.title}</h1>
          <p className={ui.muted}>{formatDate(session.date)} · {members.length} thành viên</p>
        </div>
        <div className="flex items-center gap-2">
          {/* key đổi theo nội dung để hộp sửa tự đóng sau khi lưu */}
          <details key={`${session.title}|${dateInputValue(session.date)}`} className="relative">
            <summary className={`${ui.btnGhost} cursor-pointer list-none`}>Sửa buổi</summary>
            <form
              action={updateSessionAction}
              className="absolute left-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0"
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <label className={ui.label} htmlFor="session-title">Tên buổi</label>
              <input id="session-title" name="title" defaultValue={session.title} required className={ui.input} />
              <label className={ui.label} htmlFor="session-date">Ngày</label>
              <input
                id="session-date"
                name="date"
                type="date"
                required
                defaultValue={dateInputValue(session.date)}
                className={`${ui.input} min-w-0 appearance-none`}
              />
              <SubmitButton pendingText="Đang lưu..." className="w-full" successMessage="Đã lưu thông tin buổi">Lưu</SubmitButton>
            </form>
          </details>
          <form action={deleteSessionAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <SubmitButton variant="danger" pendingText="Đang xóa..." successMessage="Đã xóa buổi điểm danh" confirm="Xóa buổi điểm danh này?">
              Xóa buổi
            </SubmitButton>
          </form>
        </div>
      </div>


      {members.length > 0 && (
        <div className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
          <div>
            <h2 className={ui.h2}>Tự điểm danh bằng QR</h2>
            <p className={ui.muted}>
              {session.selfCheckInOpen
                ? "Đang mở. Mọi người quét mã và chọn tên mình."
                : "Mọi người tự quét mã QR và chọn tên mình để điểm danh."}
            </p>
          </div>
          {session.selfCheckInOpen ? (
            <div className="flex gap-2">
              <Link href={`/groups/${group.id}/sessions/${session.id}/qr`} className={ui.btn}>Hiện mã QR</Link>
              <form action={closeSelfCheckInAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <SubmitButton variant="danger" className="py-2" pendingText="Đang đóng..." successMessage="Đã đóng tự điểm danh">Đóng</SubmitButton>
              </form>
            </div>
          ) : (
            <form action={openSelfCheckInAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <SubmitButton pendingText="Đang mở...">Mở tự điểm danh</SubmitButton>
            </form>
          )}
        </div>
      )}

      {members.length === 0 ? (
        <div className={ui.card}>
          <p className={ui.muted}>Nhóm chưa có thành viên.</p>
        </div>
      ) : (
        <form action={saveAttendanceAction} className={ui.cardFlush}>
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
                    {current?.source === "self" && current.checkedInAt && (
                      <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">
                        Tự điểm danh {formatTime(current.checkedInAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name={`orig_status_${m.id}`} value={current?.status ?? ""} />
                    <input type="hidden" name={`orig_note_${m.id}`} value={current?.note ?? ""} />
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
            <SubmitButton pendingText="Đang lưu..." successMessage="Đã lưu điểm danh">Lưu điểm danh</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
