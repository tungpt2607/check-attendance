"use client";

// Ô nhập email có gợi ý tài khoản (vd. thành viên đã liên kết trong nhóm): gõ tên hoặc email (không dấu) để lọc,
// chọn gợi ý thì điền email; vẫn nhập được email bất kỳ không có trong gợi ý.
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { normalizeSearch } from "@check-attendance/shared/search";
import { Avatar } from "./avatar";

export type EmailSuggestion = { userId: string; name: string; email: string; avatarVersion: number | null };

type Props = {
  value: string;
  onChange: (email: string) => void;
  suggestions: EmailSuggestion[];
  label: string;
  helperText?: string;
};

export function EmailAutocomplete({ value, onChange, suggestions, label, helperText }: Props) {
  return (
    <Autocomplete
      freeSolo
      options={suggestions}
      inputValue={value}
      onInputChange={(_e, v) => onChange(v)}
      // Chọn gợi ý: ô hiện email của tài khoản đó
      getOptionLabel={(o) => (typeof o === "string" ? o : o.email)}
      filterOptions={(options, state) => {
        const q = normalizeSearch(state.inputValue);
        return q ? options.filter((o) => normalizeSearch(`${o.name} ${o.email}`).includes(q)) : options;
      }}
      renderOption={({ key, ...props }, o) => (
        <Box component="li" key={key} {...props} sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
          <Avatar userId={o.userId} name={o.name} version={o.avatarVersion} size={28} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: 15 }}>
              {o.name}
            </Typography>
            <Typography noWrap variant="body2" color="text.secondary">
              {o.email}
            </Typography>
          </Box>
        </Box>
      )}
      noOptionsText="Không có gợi ý"
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          type="email"
          placeholder={suggestions.length ? "Gõ tên hoặc email..." : "ten@vidu.com"}
          helperText={helperText}
          // Nhãn luôn nằm trên viền (nhãn "bay" lên khi chạm bị lệch trên Safari iPhone)
          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
        />
      )}
    />
  );
}
