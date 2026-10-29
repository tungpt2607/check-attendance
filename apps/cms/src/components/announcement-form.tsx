"use client";

import SendRounded from "@mui/icons-material/SendRounded";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState, useState } from "react";
import type { AnnouncementAudience } from "@check-attendance/shared/admin";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { sendAnnouncementAction } from "@/modules/admin.actions";

const FIXED = { inputLabel: { shrink: true }, input: { notched: true } } as const;

export function AnnouncementForm({ audience }: { audience: AnnouncementAudience }) {
  const [state, action] = useActionState(sendAnnouncementAction, undefined);
  const [email, setEmail] = useState(false);
  const emailBlocked = !audience.emailAvailable || audience.emailRecipients > audience.emailLimit;
  const emailHint = !audience.emailAvailable
    ? "Chức năng gửi email chưa được bật."
    : audience.emailRecipients > audience.emailLimit
      ? `${audience.emailRecipients} người nhận email, vượt giới hạn ${audience.emailLimit} email một lần.`
      : `Gửi email tới ${audience.emailRecipients} người còn bật "Nhận email thông báo".`;

  return (
    // key: gửi xong thì làm trống form; lỗi thì giữ nội dung đã gõ
    <form action={action} key={state?.ok ?? state?.error ?? "new"}>
      <Stack spacing={2}>
        {state?.ok && <Alert severity="success">{state.ok}</Alert>}
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        <TextField name="title" label="Tiêu đề" required defaultValue={state?.values?.title ?? ""} slotProps={{ ...FIXED, htmlInput: { maxLength: 120 } }} />
        <TextField
          name="message"
          label="Nội dung (tùy chọn)"
          multiline
          minRows={3}
          defaultValue={state?.values?.message ?? ""}
          slotProps={{ ...FIXED, htmlInput: { maxLength: 1000 } }}
        />
        <TextField
          name="href"
          label="Mở trang khi bấm (tùy chọn)"
          placeholder="/groups"
          helperText="Đường dẫn trong web người dùng, bắt đầu bằng /. Bỏ trống thì bấm thông báo chỉ đánh dấu đã đọc."
          defaultValue={state?.values?.href ?? ""}
          slotProps={FIXED}
        />
        <FormControlLabel
          control={<Checkbox name="email" checked={email && !emailBlocked} disabled={emailBlocked} onChange={(e) => setEmail(e.target.checked)} />}
          label={
            <>
              <Typography>Gửi kèm email</Typography>
              <Typography variant="body2" color="text.secondary">
                {emailHint}
              </Typography>
            </>
          }
          sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { mt: -0.75 } }}
        />
        <SubmitButton
          startIcon={<SendRounded />}
          pendingText="Đang gửi..."
          confirm={`Gửi thông báo này tới ${audience.users} tài khoản${email && !emailBlocked ? `, kèm ${audience.emailRecipients} email` : ""}? Không thu hồi được.`}
          confirmLabel="Gửi"
          sx={{ alignSelf: "flex-start" }}
        >
          Gửi thông báo
        </SubmitButton>
      </Stack>
    </form>
  );
}
