"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import GroupAddOutlined from "@mui/icons-material/GroupAddOutlined";
import LinkOffRounded from "@mui/icons-material/LinkOffRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { deleteSessionAction } from "@/modules/attendance/attendance.actions";
import { createGroupAction, deleteGroupAction } from "@/modules/groups/group.actions";
import { unlinkMemberAction } from "@/modules/invites/invite.actions";
import type { ShareLink } from "@/modules/invites/share";
import { addMembersAction, deleteMemberAction } from "@/modules/members/member.actions";
import { ActionMenu } from "./action-menu";
import { ConfirmDialog } from "./confirm-dialog";
import { DialogForm, EditMemberDialog, EditSessionDialog, RenameGroupDialog } from "./edit-dialogs";
import { GroupInviteDialog } from "./group-invite-dialog";
import { MemberInviteDialog } from "./member-invite";
import { PageHeader } from "./page-header";
import { brand } from "@/theme/brand";

/**
 * Tiêu đề trang nhóm: tên, mô tả, nhãn "Link tham gia đang bật" (bấm để mở link)
 * và menu "⋮": Đổi tên nhóm, Link tham gia nhóm (ghi trạng thái bật/tắt), Xóa nhóm
 */
export function GroupPageHeader({
  groupId,
  groupName,
  subtitle,
  canDelete,
  inviteLink,
}: {
  groupId: string;
  groupName: string;
  subtitle: string;
  /** Chỉ xóa được khi không còn nhóm con */
  canDelete: boolean;
  inviteLink: ShareLink | null;
}) {
  const [open, setOpen] = useState<"rename" | "invite" | "delete" | null>(null);
  const [link, setLink] = useState<ShareLink | null>(inviteLink);
  const close = () => setOpen(null);
  return (
    <>
      <PageHeader
        title={groupName}
        subtitle={
          <>
            {subtitle}
            {link && (
              <Box component="span" sx={{ display: "block", mt: 1 }}>
                <Chip
                  component="span"
                  size="small"
                  icon={<LinkRounded />}
                  label="Link tham gia đang bật"
                  onClick={() => setOpen("invite")}
                  sx={{ bgcolor: brand.tealLighter, color: brand.tealDarker, fontWeight: 500, "& .MuiChip-icon": { color: brand.tealDark } }}
                />
              </Box>
            )}
          </>
        }
        actions={
          <ActionMenu
            label="Thao tác với nhóm"
            actions={[
              { label: "Đổi tên nhóm", icon: <EditOutlined fontSize="small" />, onClick: () => setOpen("rename") },
              {
                label: `Link tham gia nhóm · ${link ? "Đang bật" : "Đang tắt"}`,
                icon: <LinkRounded fontSize="small" />,
                onClick: () => setOpen("invite"),
              },
              { label: "Xóa nhóm", icon: <DeleteOutline fontSize="small" />, onClick: () => setOpen("delete"), danger: true, hidden: !canDelete },
            ]}
          />
        }
      />
      <RenameGroupDialog key={groupName} groupId={groupId} name={groupName} open={open === "rename"} onClose={close} />
      <GroupInviteDialog groupId={groupId} groupName={groupName} link={link} onLinkChange={setLink} open={open === "invite"} onClose={close} />
      {canDelete && (
        <ConfirmDialog
          open={open === "delete"}
          onClose={close}
          danger
          action={deleteGroupAction}
          redirects
          fields={{ groupId }}
          confirmLabel="Xóa nhóm"
          pendingText="Đang xóa..."
          successMessage="Đã xóa nhóm"
          message={`Xóa nhóm "${groupName}" cùng toàn bộ thành viên và dữ liệu điểm danh? Không thể khôi phục.`}
        />
      )}
    </>
  );
}

/** Menu "⋮" ở tiêu đề trang buổi điểm danh: Sửa buổi, Xóa buổi */
export function SessionHeaderMenu({ sessionId, title, date }: { sessionId: string; title: string; date: string }) {
  const [open, setOpen] = useState<"edit" | "delete" | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <ActionMenu
        label="Thao tác với buổi điểm danh"
        actions={[
          { label: "Sửa buổi", icon: <EditOutlined fontSize="small" />, onClick: () => setOpen("edit") },
          { label: "Xóa buổi", icon: <DeleteOutline fontSize="small" />, onClick: () => setOpen("delete"), danger: true },
        ]}
      />
      <EditSessionDialog key={`${title}|${date}`} sessionId={sessionId} title={title} date={date} open={open === "edit"} onClose={close} />
      <ConfirmDialog
        open={open === "delete"}
        onClose={close}
        danger
        action={deleteSessionAction}
        redirects
        fields={{ sessionId }}
        confirmLabel="Xóa buổi"
        pendingText="Đang xóa..."
        successMessage="Đã xóa buổi điểm danh"
        message="Xóa buổi điểm danh này cùng toàn bộ kết quả? Không thể khôi phục."
      />
    </>
  );
}

/** Menu "⋮" ở mỗi dòng thành viên: Mời liên kết / Hủy liên kết, Sửa, Xóa */
export function MemberRowMenu({
  memberId,
  name,
  code,
  groupName,
  linkedEmail,
}: {
  memberId: string;
  name: string;
  code: string;
  groupName: string;
  /** null: chưa liên kết tài khoản */
  linkedEmail: string | null;
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
        fields={{ memberId }}
        confirmLabel="Xóa"
        pendingText="Đang xóa..."
        successMessage="Đã xóa thành viên"
        message={`Xóa "${name}" khỏi nhóm? Toàn bộ lịch sử điểm danh của người này cũng sẽ bị xóa và không khôi phục được.`}
      />
    </>
  );
}

/** Nút "+ Thêm thành viên": mở hộp thoại có ô nhập nhiều dòng */
export function AddMembersButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
        Thêm thành viên
      </Button>
      <DialogForm
        title="Thêm thành viên"
        open={open}
        onClose={() => setOpen(false)}
        action={addMembersAction}
        successMessage="Đã thêm thành viên"
        submitLabel="Thêm"
        pendingText="Đang thêm..."
        submitIcon={<GroupAddOutlined />}
      >
        <input type="hidden" name="groupId" value={groupId} />
        {/* Ô nhiều dòng: cố định nhãn nằm trên viền và phần hở của viền,
            vì nhãn nổi tự động bị lệch viền trên iPhone */}
        <TextField
          id="add-members"
          name="members"
          label="Danh sách"
          slotProps={{ inputLabel: { shrink: true }, input: { notched: true } }}
          multiline
          minRows={5}
          required
          autoFocus
          placeholder={"Mỗi dòng một người, ví dụ:\nNguyễn Văn An\nHS002, Trần Thị Bình"}
          helperText="Có thể dán từ Excel: cột Mã và cột Tên."
        />
      </DialogForm>
    </>
  );
}

/** Nút "+ Tạo nhóm con": mở hộp thoại nhập tên */
export function CreateSubgroupButton({ parentId }: { parentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
        Tạo nhóm con
      </Button>
      <DialogForm
        title="Tạo nhóm con"
        open={open}
        onClose={() => setOpen(false)}
        action={createGroupAction}
        successMessage="Đã tạo nhóm con"
        submitLabel="Tạo"
        pendingText="Đang tạo..."
        submitIcon={<AddRounded />}
      >
        <input type="hidden" name="parentId" value={parentId} />
        <TextField name="name" label="Tên nhóm con" required autoFocus />
      </DialogForm>
    </>
  );
}
