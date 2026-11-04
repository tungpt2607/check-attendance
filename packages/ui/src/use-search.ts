"use client";

// Tìm kiếm không dấu trong một danh sách đã tải sẵn.
// Chuỗi tìm kiếm của từng mục chỉ chuẩn hóa MỘT lần khi danh sách đổi (không phải mỗi lần gõ phím).
import { useMemo, useRef, useState } from "react";
import { normalizeSearch } from "@check-attendance/shared/search";

export type SearchState<T> = {
  query: string;
  setQuery: (q: string) => void;
  /** Đang có từ khóa tìm kiếm */
  active: boolean;
  /** Mục này có khớp từ khóa không (luôn đúng khi chưa gõ gì) */
  matches: (item: T) => boolean;
  /** Các mục khớp, giữ nguyên thứ tự */
  results: T[];
};

/** Chuỗi tìm kiếm mặc định cho người/thành viên: tên + mã số */
export const nameAndCode = (m: { name: string; code?: string }) => `${m.name} ${m.code ?? ""}`;

export function useSearch<T>(items: T[], textOf: (item: T) => string): SearchState<T> {
  const [query, setQuery] = useState("");
  // textOf thường viết thẳng trong lúc gọi (hàm mới mỗi lần render): giữ bản mới nhất, không tính lại vì nó
  const textOfRef = useRef(textOf);
  textOfRef.current = textOf;
  const index = useMemo(() => new Map(items.map((it) => [it, normalizeSearch(textOfRef.current(it))])), [items]);

  const q = normalizeSearch(query);
  return useMemo(() => {
    const matches = (item: T) => !q || (index.get(item) ?? normalizeSearch(textOfRef.current(item))).includes(q);
    return { query, setQuery, active: !!q, matches, results: q ? items.filter(matches) : items };
  }, [index, items, q, query]);
}
