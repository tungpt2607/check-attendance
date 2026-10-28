"use client";

import EditOutlined from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, type ReactNode } from "react";
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
  children: ReactNode;
};

/** Hộp thoại chứa form sửa: gửi xong tự đóng và báo thông báo nhỏ */
function DialogForm({ title, open, onClose, action, successMessage, children }: DialogFormProps) {
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
          <SubmitButton pendingText="Đang lưu...">Lưu</SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function RenameGroupButton({ groupId, name }: { groupId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={() => setOpen(true)}>
        Đổi tên
      </Button>
      <DialogForm
        title="Đổi tên nhóm"
        open={open}
        onClose={() => setOpen(false)}
        action={renameGroupAction}
        successMessage="Đã đổi tên nhóm"
      >
        <input type="hidden" name="groupId" value={groupId} />
        <TextField name="name" label="Tên nhóm" defaultValue={name} required autoFocus />
      </DialogForm>
    </>
  );
}

export function EditMemberButton({ memberId, name, code }: { memberId: string; name: string; code: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton size="small" aria-label={`Sửa ${name}`} onClick={() => setOpen(true)}>
        <EditOutlined fontSize="small" />
      </IconButton>
      <DialogForm
        title="Sửa thành viên"
        open={open}
        onClose={() => setOpen(false)}
        action={updateMemberAction}
        successMessage="Đã lưu thông tin thành viên"
      >
        <input type="hidden" name="memberId" value={memberId} />
        <TextField name="name" label="Họ tên" defaultValue={name} required autoFocus />
        <TextField name="code" label="Mã số (tùy chọn)" defaultValue={code} />
      </DialogForm>
    </>
  );
}

export function EditSessionButton({ sessionId, title, date }: { sessionId: string; title: string; date: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={() => setOpen(true)}>
        Sửa buổi
      </Button>
      <DialogForm
        title="Sửa buổi điểm danh"
        open={open}
        onClose={() => setOpen(false)}
        action={updateSessionAction}
        successMessage="Đã lưu thông tin buổi"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <TextField name="title" label="Tên buổi" defaultValue={title} required autoFocus />
        <TextField name="date" label="Ngày" type="date" defaultValue={date} required slotProps={{ inputLabel: { shrink: true } }} />
      </DialogForm>
    </>
  );
}
