"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { type ReactNode } from "react";
import { renameGroupAction } from "@/modules/groups/group.actions";
import { updateMemberAction } from "@/modules/members/member.actions";
import { updateSessionAction } from "@/modules/attendance/attendance.actions";
import { SubmitButton } from "./submit-button";
import { toast } from "./toaster";

type DialogFormProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  /** Hành động máy chủ nhận FormData */
  action: (fd: FormData) => Promise<void>;
  successMessage: string;
  submitLabel?: string;
  pendingText?: string;
  submitIcon?: ReactNode;
  children: ReactNode;
};

/** Hộp thoại chứa form: gửi xong tự đóng và báo thông báo nhỏ */
export function DialogForm({
  title,
  open,
  onClose,
  action,
  successMessage,
  submitLabel = "Lưu",
  pendingText = "Đang lưu...",
  submitIcon,
  children,
}: DialogFormProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form
        action={async (fd) => {
          await action(fd);
          onClose();
          toast(successMessage);
        }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={onClose}>
            Hủy
          </Button>
          <SubmitButton pendingText={pendingText} startIcon={submitIcon}>
            {submitLabel}
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

type Open = { open: boolean; onClose: () => void };

export function RenameGroupDialog({ groupId, name, open, onClose }: Open & { groupId: string; name: string }) {
  return (
    <DialogForm title="Đổi tên nhóm" open={open} onClose={onClose} action={renameGroupAction} successMessage="Đã đổi tên nhóm">
      <input type="hidden" name="groupId" value={groupId} />
      <TextField name="name" label="Tên nhóm" defaultValue={name} required autoFocus />
    </DialogForm>
  );
}

export function EditMemberDialog({ memberId, name, code, open, onClose }: Open & { memberId: string; name: string; code: string }) {
  return (
    <DialogForm title="Sửa thành viên" open={open} onClose={onClose} action={updateMemberAction} successMessage="Đã lưu thông tin thành viên">
      <input type="hidden" name="memberId" value={memberId} />
      <TextField name="name" label="Họ tên" defaultValue={name} required autoFocus />
      <TextField name="code" label="Mã số (tùy chọn)" defaultValue={code} />
    </DialogForm>
  );
}

export function EditSessionDialog({ sessionId, title, date, open, onClose }: Open & { sessionId: string; title: string; date: string }) {
  return (
    <DialogForm title="Sửa buổi điểm danh" open={open} onClose={onClose} action={updateSessionAction} successMessage="Đã lưu thông tin buổi">
      <input type="hidden" name="sessionId" value={sessionId} />
      <TextField name="title" label="Tên buổi" defaultValue={title} required autoFocus />
      <TextField name="date" label="Ngày" type="date" defaultValue={date} required slotProps={{ inputLabel: { shrink: true } }} />
    </DialogForm>
  );
}
