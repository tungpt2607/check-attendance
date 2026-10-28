"use client";

import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { normalizeSearch } from "@/lib/search";
import { useFastTap } from "./use-fast-tap";

const PAGE_SIZE = 20;

type Props = {
  children: ReactNode;
  /** Hiện ô tìm kiếm (không dấu, tìm trong toàn bộ danh sách) */
  searchable?: boolean;
  placeholder?: string;
};

/**
 * Bọc một danh sách dài: hiện 20 dòng đầu, "Xem thêm" mỗi lần 20 dòng, "Thu gọn" về 20 dòng đầu.
 * Mỗi dòng của danh sách cần thuộc tính data-search (chuỗi đã chuẩn hóa) để tìm kiếm.
 * Dòng bị ẩn chỉ ẩn trên màn hình, dữ liệu đã tải sẵn nên bấm là hiện ngay.
 */
export function PagedList({ children, searchable = false, placeholder = "Tìm theo tên hoặc mã..." }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [matched, setMatched] = useState(0);
  const [ready, setReady] = useState(false);
  // Hàng nút "Xem thêm / Thu gọn": giữ nó đứng đúng chỗ trên màn hình sau khi thu gọn
  const actionsRef = useRef<HTMLDivElement>(null);
  const keepActionsAt = useRef<number | null>(null);
  // Số dòng đang hiện trước lần đổi: dòng mới hiện thêm thì có hiệu ứng hiện dần
  const shownBefore = useRef(PAGE_SIZE);
  const animateNew = useRef(false);

  // Ẩn/hiện dòng trước khi màn hình vẽ, cùng lúc với chữ trên nút (không bị lệch nhịp)
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const q = normalizeSearch(query);
    let n = 0;
    for (const row of Array.from(box.querySelectorAll<HTMLElement>("[data-search]"))) {
      const match = !q || (row.dataset.search ?? "").includes(q);
      if (match) n++;
      const show = match && n <= limit;
      row.style.display = show ? "" : "none";
      // Dòng vừa được "Xem thêm" mở ra: hiện dần
      if (show && animateNew.current && n > shownBefore.current) row.classList.add("ca-fade-in");
      else row.classList.remove("ca-fade-in");
    }
    animateNew.current = false;
    shownBefore.current = Math.min(n, limit);
    setMatched(n);
    setReady(true);
    // Sau khi thu gọn: cuộn bù để hàng nút nằm đúng chỗ vừa bấm (không bị kéo lên đầu danh sách)
    if (keepActionsAt.current !== null) {
      const before = keepActionsAt.current;
      keepActionsAt.current = null;
      const now = actionsRef.current?.getBoundingClientRect().top;
      if (now !== undefined) window.scrollBy({ top: now - before, behavior: "instant" as ScrollBehavior });
    }
  }, [query, limit, children]);

  const remaining = Math.max(0, matched - limit);
  const more = () => {
    animateNew.current = true;
    setLimit((l) => l + PAGE_SIZE);
  };
  const collapse = () => {
    keepActionsAt.current = actionsRef.current?.getBoundingClientRect().top ?? null;
    setLimit(PAGE_SIZE);
  };
  const moreTap = useFastTap(more);
  const collapseTap = useFastTap(collapse);

  return (
    <Box
      ref={boxRef}
      data-ready={ready ? "" : undefined}
      sx={{
        // Trước khi script chạy: ẩn sẵn từ dòng thứ 21, tránh cả danh sách chớp hiện rồi mới co lại
        [`&:not([data-ready]) li[data-search]:nth-of-type(n+${PAGE_SIZE + 1})`]: { display: "none" },
      }}
    >
      {searchable && (
        <Box sx={{ mb: 1 }}>
          <TextField
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={placeholder}
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
          {query && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Tìm thấy {matched} người
            </Typography>
          )}
        </Box>
      )}

      {children}

      {(remaining > 0 || limit > PAGE_SIZE) && (
        <Stack ref={actionsRef} direction="row" spacing={1} sx={{ justifyContent: "center", mt: 1 }}>
          {remaining > 0 && (
            <Button size="small" startIcon={<ExpandMoreRounded />} {...moreTap}>
              Xem thêm (còn {remaining} người)
            </Button>
          )}
          {limit > PAGE_SIZE && (
            <Button size="small" color="inherit" startIcon={<ExpandLessRounded />} {...collapseTap}>
              Thu gọn
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
