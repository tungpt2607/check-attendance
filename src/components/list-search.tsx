"use client";

import SearchRounded from "@mui/icons-material/SearchRounded";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { normalizeSearch } from "@/lib/search";

type Props = {
  /** id của danh sách; mỗi dòng cần data-search (chuỗi đã chuẩn hóa) */
  listId: string;
  placeholder?: string;
};

/** Ô tìm kiếm không dấu, lọc các dòng của một danh sách ngay trên trình duyệt. */
export function ListSearch({ listId, placeholder = "Tìm theo tên hoặc mã..." }: Props) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const list = document.getElementById(listId);
    if (!list) return;
    const q = normalizeSearch(query);
    let n = 0;
    for (const row of Array.from(list.querySelectorAll<HTMLElement>("[data-search]"))) {
      const show = !q || (row.dataset.search ?? "").includes(q);
      row.style.display = show ? "" : "none";
      if (show) n++;
    }
    setShown(q ? n : null);
  }, [listId, query]);

  return (
    <>
      <TextField
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
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
      {shown !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Tìm thấy {shown} người
        </Typography>
      )}
    </>
  );
}
