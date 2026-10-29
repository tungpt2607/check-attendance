"use client";

// Ô tìm kiếm ghi vào địa chỉ (?q=), về trang 1. Gõ xong bấm Enter hoặc nút Tìm.
import SearchRounded from "@mui/icons-material/SearchRounded";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function SearchBar({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const next = new URLSearchParams(params.toString());
    const q = value.trim();
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("page");
    startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`));
  };

  return (
    <Stack
      component="form"
      direction="row"
      spacing={1}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <TextField
        size="small"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        type="search"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button type="submit" variant="contained" disabled={pending} sx={{ flexShrink: 0 }}>
        Tìm
      </Button>
    </Stack>
  );
}
