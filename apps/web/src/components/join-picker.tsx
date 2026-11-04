"use client";

import RadioButtonCheckedRounded from "@mui/icons-material/RadioButtonCheckedRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { requestLinkAction } from "@/modules/invites/invite.actions";
import { brand } from "@check-attendance/ui/brand";
import { NameWithCode } from "@check-attendance/ui/name-with-code";
import { SearchList } from "@check-attendance/ui/search-list";
import { SubmitButton } from "@check-attendance/ui/submit-button";

type Option = { id: string; name: string; code: string };

/** Chọn tên mình trong danh sách chưa liên kết rồi gửi yêu cầu cho chủ nhóm duyệt */
export function JoinPicker({ token, members }: { token: string; members: Option[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const chosen = members.find((m) => m.id === selected);

  return (
    <form action={requestLinkAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="memberId" value={selected ?? ""} />
      <Stack spacing={1.5}>
        <SearchList
          items={members}
          keyOf={(m) => m.id}
          placeholder="Tìm tên của bạn..."
          insideForm
          maxHeight={380}
          renderItem={(m, { divider }) => {
            const on = m.id === selected;
            return (
              <ListItemButton
                divider={divider}
                selected={on}
                onClick={() => setSelected(m.id)}
                sx={{ py: 1.25, "&.Mui-selected": { bgcolor: brand.tealLighter } }}
              >
                {on ? (
                  <RadioButtonCheckedRounded fontSize="small" sx={{ color: brand.tealDark, mr: 1.5 }} />
                ) : (
                  <RadioButtonUncheckedRounded fontSize="small" sx={{ color: "text.disabled", mr: 1.5 }} />
                )}
                <ListItemText primary={<NameWithCode name={m.name} code={m.code} />} slotProps={{ primary: { fontWeight: on ? 700 : 500 } }} />
              </ListItemButton>
            );
          }}
        />
        {chosen ? (
          <SubmitButton fullWidth size="large" pendingText="Đang gửi..." startIcon={<SendRounded />} sx={{ whiteSpace: "normal" }}>
            Tôi là {chosen.name}, gửi yêu cầu
          </SubmitButton>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Chọn tên của bạn trong danh sách.
          </Typography>
        )}
      </Stack>
    </form>
  );
}
