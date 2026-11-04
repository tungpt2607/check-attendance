"use client";

// Hộp thoại trượt lên từ đáy màn hình trên điện thoại (dễ bấm bằng ngón cái), ở giữa màn hình trên máy tính.
import Dialog, { type DialogProps } from "@mui/material/Dialog";

export function BottomSheetDialog({ sx, ...props }: DialogProps) {
  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      {...props}
      sx={[{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }, ...(sx === undefined ? [] : Array.isArray(sx) ? sx : [sx])]}
    />
  );
}
