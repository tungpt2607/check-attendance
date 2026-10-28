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
    // Lớp phủ toàn màn hình: che thanh tiêu đề, mọi thứ vừa trong một màn hình điện thoại
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-slate-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-3">
        <div className="text-center leading-tight">
          <p className="truncate font-semibold">
            {group.name} · {session.title}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(session.date)} · Quét mã và chọn tên mình để điểm danh
          </p>
        </div>

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
    </div>
  );
}
