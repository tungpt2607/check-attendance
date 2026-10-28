"use client";

import { useEffect, useState } from "react";
import { normalizeSearch } from "@/lib/search";
import { SearchIcon } from "./search-icon";

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
      row.hidden = !show;
      if (show) n++;
    }
    setShown(q ? n : null);
  }, [listId, query]);

  return (
    <div className="mb-2 space-y-1">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-base outline-none sm:text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <SearchIcon />
      </div>
      {shown !== null && <p className="text-xs text-slate-500">Tìm thấy {shown} người</p>}
    </div>
  );
}
