"use client";

import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { testEmailAction } from "@/modules/admin.actions";

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [state, action] = useActionState(testEmailAction, undefined);
  return (
    <form action={action}>
      <Stack spacing={1.5}>
        {state?.ok && <Alert severity="success">{state.ok}</Alert>}
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField name="to" type="email" label="Gửi tới" defaultValue={defaultTo} slotProps={{ inputLabel: { shrink: true } }} />
          <SubmitButton startIcon={<MailOutlineRounded />} pendingText="Đang gửi..." sx={{ flexShrink: 0, height: 40 }}>
            Gửi email thử
          </SubmitButton>
        </Stack>
      </Stack>
    </form>
  );
}
