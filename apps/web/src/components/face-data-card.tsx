"use client";

// Thẻ "Dữ liệu khuôn mặt" (trang thành viên của chủ nhóm và trang Tài khoản): trạng thái + nút xóa
import FaceRetouchingNaturalRounded from "@mui/icons-material/FaceRetouchingNaturalRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ConfirmDialog } from "@check-attendance/ui/confirm-dialog";
import { brand } from "@check-attendance/ui/brand";

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
    <Card>
      <CardContent sx={{ p: 2.5, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", minWidth: 0 }}>
          <FaceRetouchingNaturalRounded sx={{ color: brand.tealDark, mt: 0.25 }} />
          <Box>
            <Typography variant="h2">Dữ liệu khuôn mặt</Typography>
            <Typography variant="body2" color="text.secondary">
              {status}
            </Typography>
          </Box>
        </Box>
        {canDelete && (
          <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
            Xóa khuôn mặt
          </Button>
        )}
      </CardContent>
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
    </Card>
  );
}
