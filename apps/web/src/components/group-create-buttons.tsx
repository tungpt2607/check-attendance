"use client";

// Nút mở hộp thoại: thêm thành viên, tạo nhóm con
import AddRounded from "@mui/icons-material/AddRounded";
import GroupAddOutlined from "@mui/icons-material/GroupAddOutlined";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { createGroupAction } from "@/modules/groups/group.actions";
import { addMembersAction } from "@/modules/members/member.actions";
import { DialogForm } from "./edit-dialogs";

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
