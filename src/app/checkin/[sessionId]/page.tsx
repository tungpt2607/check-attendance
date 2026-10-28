import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { CheckInList } from "@/components/checkin-list";
import { deviceCookieName, verifyCheckInToken } from "@/lib/checkin-token";
import { formatDate } from "@/lib/format";
import { getAttendanceSession, getCheckInSecret, getSessionRecords } from "@/modules/attendance/attendance.service";
import { getGroupName } from "@/modules/groups/group.service";
import { getMember, listMembers } from "@/modules/members/member.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tự điểm danh" };

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ t?: string }>;
};

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export default async function CheckInPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const { t } = await searchParams;

  const session = await getAttendanceSession(sessionId);
  if (!session) return <Notice title="Không tìm thấy buổi điểm danh" />;

  const secret = await getCheckInSecret(sessionId);
  if (!secret) return <Notice title="Điểm danh đã đóng">Buổi này không còn nhận tự điểm danh.</Notice>;
  if (!verifyCheckInToken(sessionId, secret, t)) {
    return <Notice title="Mã QR đã hết hạn">Hãy quét lại mã đang hiện trên màn hình.</Notice>;
  }

  const groupName = (await getGroupName(session.groupId)) ?? "";
  const header = (
    <div className="mb-4 text-center">
      <p className="text-sm text-slate-500">{groupName}</p>
      <h1 className="text-xl font-semibold">{session.title}</h1>
      <p className="text-sm text-slate-500">{formatDate(session.date)}</p>
    </div>
  );

  // Điện thoại này đã điểm danh trong buổi
  const store = await cookies();
  const doneId = store.get(deviceCookieName(sessionId))?.value;
  if (doneId) {
    const m = await getMember(doneId);
    return (
      <div className="mx-auto max-w-md">
        {header}
        <div className="rounded-2xl bg-brand-50 p-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-3xl text-white">✓</div>
          <p className="text-lg font-semibold text-brand-900">Bạn đã điểm danh</p>
          {m && <p className="mt-1 text-brand-800">{m.name}</p>}
        </div>
      </div>
    );
  }

  const [members, records] = await Promise.all([listMembers(session.groupId), getSessionRecords(sessionId)]);
  const list = members.map((m) => {
    const st = records.get(m.id)?.status;
    return { id: m.id, name: m.name, code: m.code, checkedIn: st === "present" || st === "late" };
  });

  return (
    <div className="mx-auto max-w-md">
      {header}
      <CheckInList sessionId={sessionId} token={t ?? ""} members={list} />
    </div>
  );
}
