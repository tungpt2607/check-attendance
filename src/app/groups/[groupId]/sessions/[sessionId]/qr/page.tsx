import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QrPresenter } from "@/components/qr-presenter";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { closeSelfCheckInAction } from "@/modules/attendance/attendance.actions";
import { getAttendanceSession } from "@/modules/attendance/attendance.service";
import { getOwnedGroup } from "@/modules/groups/group.service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string; sessionId: string }> };

export default async function QrPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const user = await requireUser();
  const group = await getOwnedGroup(groupId, user.userId);
  const session = group ? await getAttendanceSession(sessionId) : null;
  if (!group || !session || session.groupId !== group.id) notFound();
  if (!session.selfCheckInOpen) redirect(`/groups/${group.id}/sessions/${session.id}`);

  const back = `/groups/${group.id}/sessions/${session.id}`;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <p className="text-sm text-slate-500">{group.name}</p>
        <h1 className="text-2xl font-semibold">{session.title}</h1>
        <p className={ui.muted}>{formatDate(session.date)}</p>
      </div>

      <p className="rounded-lg bg-indigo-50 px-4 py-2 text-center text-sm text-indigo-800">
        Mở camera điện thoại, quét mã và chọn tên mình để điểm danh.
      </p>

      <QrPresenter sessionId={session.id} />

      <div className="flex gap-2">
        <Link href={back} className={`${ui.btnGhost} flex-1`}>Xem danh sách</Link>
        <form action={closeSelfCheckInAction} className="flex-1">
          <input type="hidden" name="sessionId" value={session.id} />
          <SubmitButton
            variant="danger"
            className="w-full py-2"
            pendingText="Đang đóng..."
            confirm="Đóng tự điểm danh? Sau khi đóng, quét mã sẽ không điểm danh được nữa."
          >
            Đóng điểm danh
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
