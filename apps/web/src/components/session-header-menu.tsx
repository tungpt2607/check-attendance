"use client";

// Menu ⋮ ở tiêu đề trang buổi điểm danh
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { useState } from "react";
import { deleteSessionAction } from "@/modules/attendance/attendance.actions";
import { ActionMenu } from "@check-attendance/ui/action-menu";
import { ConfirmDialog } from "@check-attendance/ui/confirm-dialog";
import { EditSessionDialog } from "./edit-dialogs";

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
