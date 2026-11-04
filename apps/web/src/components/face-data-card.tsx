"use client";

// Thẻ "Dữ liệu khuôn mặt" (trang thành viên của chủ nhóm và trang Tài khoản): trạng thái + nút xóa
import FaceRetouchingNaturalRounded from "@mui/icons-material/FaceRetouchingNaturalRounded";
import Button from "@mui/material/Button";
import { useState } from "react";
import { ConfirmDialog } from "@check-attendance/ui/confirm-dialog";
import { FeatureCard } from "@check-attendance/ui/feature-card";

type Props = {
  status: string;
  /** Có dữ liệu để xóa không (không có thì ẩn nút xóa) */
  canDelete: boolean;
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  confirmMessage: string;
};

export function FaceDataCard({ status, canDelete, action, fields, confirmMessage }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <FeatureCard
      icon={<FaceRetouchingNaturalRounded />}
      title="Dữ liệu khuôn mặt"
      description={status}
      actions={
        canDelete && (
          <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
            Xóa khuôn mặt
          </Button>
        )
      }
    >
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger
        action={action}
        fields={fields}
        confirmLabel="Xóa"
        pendingText="Đang xóa..."
        successMessage="Đã xóa dữ liệu khuôn mặt"
        message={confirmMessage}
      />
    </FeatureCard>
  );
}
