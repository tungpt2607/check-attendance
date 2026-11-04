"use client";

// Danh sách có ô tìm kiếm không dấu: tự điểm danh QR, chọn tên khi tham gia nhóm, chọn tên khi quét khuôn mặt...
// Nơi dùng chỉ cần nói mỗi dòng trông thế nào (renderItem).
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { SearchField } from "./search-field";
import { nameAndCode, useSearch } from "./use-search";

type Props<T> = {
  items: T[];
  /** Khóa React của mỗi dòng */
  keyOf: (item: T) => string;
  /** Chuỗi để tìm; mặc định tên + mã số */
  textOf?: (item: T) => string;
  /** Vẽ một dòng (thường là ListItemButton); divider: có kẻ ngăn cách với dòng dưới không */
  renderItem: (item: T, opts: { divider: boolean }) => ReactNode;
  placeholder?: string;
  /** Khi chưa tìm mà danh sách rỗng */
  emptyText?: string;
  /** Khi tìm không thấy */
  noMatchText?: string;
  /** Giới hạn chiều cao danh sách (cuộn bên trong) */
  maxHeight?: number;
  /** Danh sách nằm trong khung đã có viền (hộp thoại): không bọc Card */
  bare?: boolean;
  /** Ô tìm kiếm nằm trong form khác (xem SearchField) */
  insideForm?: boolean;
  /** Nội dung thêm dưới ô tìm kiếm (vd. công tắc lọc) */
  toolbar?: ReactNode;
};

export function SearchList<T>({
  items,
  keyOf,
  textOf = nameAndCode as (item: T) => string,
  renderItem,
  placeholder = "Tìm tên...",
  emptyText = "Danh sách trống.",
  noMatchText = "Không tìm thấy tên phù hợp.",
  maxHeight,
  bare = false,
  insideForm = false,
  toolbar,
}: Props<T>) {
  const { query, setQuery, active, results } = useSearch(items, textOf);

  const list = (
    <List disablePadding sx={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
      {results.length === 0 && (
        <Typography sx={{ py: 3, textAlign: "center" }} variant="body2" color="text.secondary">
          {active ? noMatchText : emptyText}
        </Typography>
      )}
      {results.map((item, i) => (
        <Box component="li" key={keyOf(item)} sx={{ listStyle: "none" }}>
          {renderItem(item, { divider: i < results.length - 1 })}
        </Box>
      ))}
    </List>
  );

  return (
    <Stack spacing={1.5}>
      <SearchField value={query} onChange={setQuery} placeholder={placeholder} insideForm={insideForm} />
      {toolbar}
      {bare ? list : <Card>{list}</Card>}
    </Stack>
  );
}
