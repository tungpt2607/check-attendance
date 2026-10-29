"use client";

// Menu ⋮ ở mỗi dòng thành viên
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import { useState } from "react";
import { unlinkMemberAction } from "@/modules/invites/invite.actions";
import { deleteMemberAction } from "@/modules/members/member.actions";
import { ActionMenu } from "@check-attendance/ui/action-menu";
import { ConfirmDialog } from "@check-attendance/ui/confirm-dialog";
import { EditMemberDialog } from "./edit-dialogs";
import { MemberInviteDialog } from "./member-invite";

/** Menu "⋮" ở mỗi dòng thành viên: Mời liên kết / Hủy liên kết, Sửa, Xóa */
export function MemberRowMenu({
  memberId,
  name,
  code,
  groupName,
  linkedEmail,
  onDetailPage = false,
}: {
  memberId: string;
  name: string;
  code: string;
  groupName: string;
  /** null: chưa liên kết tài khoản */
  linkedEmail: string | null;
  /** Đang ở trang thống kê của thành viên: xóa xong thì quay về nhóm */
  onDetailPage?: boolean;
}) {
  const [open, setOpen] = useState<"invite" | "unlink" | "edit" | "delete" | null>(null);
  const close = () => setOpen(null);
  const linked = linkedEmail !== null;
  return (
    <>
      <ActionMenu
        size="small"
        label={`Thao tác với ${name}`}
        actions={[
          { label: "Mời liên kết tài khoản", icon: <PersonAddAltRounded fontSize="small" />, onClick: () => setOpen("invite"), hidden: linked },
          { label: "Hủy liên kết", icon: <LinkOffRounded fontSize="small" />, onClick: () => setOpen("unlink"), hidden: !linked },
          { label: "Sửa", icon: <EditOutlined fontSize="small" />, onClick: () => setOpen("edit") },
          { label: "Xóa", icon: <DeleteOutline fontSize="small" />, onClick: () => setOpen("delete"), danger: true },
        ]}
      />
      {!linked && <MemberInviteDialog memberId={memberId} name={name} groupName={groupName} open={open === "invite"} onClose={close} />}
      {linked && (
        <ConfirmDialog
          open={open === "unlink"}
          onClose={close}
          action={unlinkMemberAction}
          fields={{ memberId }}
          confirmLabel="Hủy liên kết"
          danger
          successMessage="Đã hủy liên kết"
          message={`Hủy liên kết tài khoản ${linkedEmail} khỏi "${name}"? Lịch sử điểm danh vẫn giữ nguyên.`}
        />
      )}
      <EditMemberDialog key={`${name}|${code}`} memberId={memberId} name={name} code={code} open={open === "edit"} onClose={close} />
      <ConfirmDialog
        open={open === "delete"}
        onClose={close}
        danger
        action={deleteMemberAction}
        redirects={onDetailPage}
        fields={onDetailPage ? { memberId, back: "group" } : { memberId }}
        confirmLabel="Xóa"
        pendingText="Đang xóa..."
        successMessage="Đã xóa thành viên"
        message={`Xóa "${name}" khỏi nhóm? Toàn bộ lịch sử điểm danh của người này cũng sẽ bị xóa và không khôi phục được.`}
      />
    </>
  );
}
