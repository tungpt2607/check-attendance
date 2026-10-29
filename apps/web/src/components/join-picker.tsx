"use client";

import RadioButtonCheckedRounded from "@mui/icons-material/RadioButtonCheckedRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { normalizeSearch } from "@check-attendance/shared/search";
import { requestLinkAction } from "@/modules/invites/invite.actions";
import { brand } from "@/theme/brand";
import { SubmitButton } from "./submit-button";

type Option = { id: string; name: string; code: string };

/** Chọn tên mình trong danh sách chưa liên kết rồi gửi yêu cầu cho chủ nhóm duyệt */
export function JoinPicker({ token, members }: { token: string; members: Option[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return q ? members.filter((m) => normalizeSearch(`${m.name} ${m.code}`).includes(q)) : members;
  }, [members, query]);

  const chosen = members.find((m) => m.id === selected);

  return (
    <form action={requestLinkAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="memberId" value={selected ?? ""} />
      <Stack spacing={1.5}>
        <TextField
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên của bạn..."
          slotProps={{
            htmlInput: { form: "__none__" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Card sx={{ maxHeight: 380, overflowY: "auto" }}>
          <List disablePadding>
            {filtered.length === 0 && (
              <Typography sx={{ py: 3, textAlign: "center" }} variant="body2" color="text.secondary">
                Không tìm thấy tên phù hợp.
              </Typography>
            )}
            {filtered.map((m, i) => {
              const on = m.id === selected;
              return (
                <ListItemButton
                  key={m.id}
                  divider={i < filtered.length - 1}
                  selected={on}
                  onClick={() => setSelected(m.id)}
                  sx={{ py: 1.25, "&.Mui-selected": { bgcolor: brand.tealLighter } }}
                >
                  {on ? (
                    <RadioButtonCheckedRounded fontSize="small" sx={{ color: brand.tealDark, mr: 1.5 }} />
                  ) : (
                    <RadioButtonUncheckedRounded fontSize="small" sx={{ color: "text.disabled", mr: 1.5 }} />
                  )}
                  <ListItemText
                    primary={
                      <>
                        {m.code && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                            {m.code}
                          </Typography>
                        )}
                        {m.name}
                      </>
                    }
                    slotProps={{ primary: { fontWeight: on ? 700 : 500 } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Card>
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
