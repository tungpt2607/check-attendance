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

const PAGE_SIZE = 20;
/** Khoảng chừa phía trên khi đưa đầu danh sách vào màn hình: thanh tiêu đề + thanh tab dính */
const SCROLL_MARGIN = 112;

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
  const scrollAfter = useRef(false);

  // Ẩn/hiện dòng trước khi màn hình vẽ, cùng lúc với chữ trên nút (không bị lệch nhịp)
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const q = normalizeSearch(query);
    let n = 0;
    for (const row of Array.from(box.querySelectorAll<HTMLElement>("[data-search]"))) {
      const match = !q || (row.dataset.search ?? "").includes(q);
      if (match) n++;
      row.style.display = match && n <= limit ? "" : "none";
    }
    setMatched(n);
    setReady(true);
    // Sau khi thu gọn: nếu đầu danh sách đã trôi lên khỏi màn hình thì đưa về ngay, không cuộn mượt
    if (scrollAfter.current) {
      scrollAfter.current = false;
      if (box.getBoundingClientRect().top < SCROLL_MARGIN) box.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    }
  }, [query, limit, children]);

  const remaining = Math.max(0, matched - limit);
  const collapse = () => {
    // Đưa đầu danh sách vào màn hình để không bị lạc ở cuối trang sau khi thu gọn
    scrollAfter.current = true;
    setLimit(PAGE_SIZE);
  };

  return (
    <Box
      ref={boxRef}
      data-ready={ready ? "" : undefined}
      sx={{
        scrollMarginTop: SCROLL_MARGIN,
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
        <Stack direction="row" spacing={1} sx={{ justifyContent: "center", mt: 1 }}>
          {remaining > 0 && (
            <Button size="small" startIcon={<ExpandMoreRounded />} onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Xem thêm (còn {remaining} người)
            </Button>
          )}
          {limit > PAGE_SIZE && (
            <Button size="small" color="inherit" startIcon={<ExpandLessRounded />} onClick={collapse}>
              Thu gọn
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
