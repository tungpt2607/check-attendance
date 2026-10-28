"use client";

import { useCallback, useEffect, useState } from "react";
import { ATTENDANCE_STATUSES } from "@/modules/attendance/attendance.statuses";
import { normalizeSearch } from "@/lib/search";

type Props = {
  /** id của <ul> chứa các dòng thành viên (mỗi dòng có data-search và data-member) */
  listId: string;
};

/**
 * Lọc danh sách điểm danh ngay trên trình duyệt: tìm theo tên/mã (không dấu) và theo trạng thái.
 * Chỉ ẩn dòng bằng CSS nên khi bấm Lưu, kết quả của mọi thành viên vẫn được gửi đi.
 */
export function AttendanceFilter({ listId }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [visible, setVisible] = useState(0);
  const [total, setTotal] = useState(0);

  const apply = useCallback(() => {
    const list = document.getElementById(listId);
    if (!list) return;
    const q = normalizeSearch(query);
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-member]"));
    const nextCounts: Record<string, number> = {};
    let shown = 0;

    for (const row of rows) {
      const checked = row.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value ?? "";
      nextCounts[checked] = (nextCounts[checked] ?? 0) + 1;
      const matchText = !q || (row.dataset.search ?? "").includes(q);
      const matchStatus = status === "all" || checked === status;
      const show = matchText && matchStatus;
      row.hidden = !show;
      if (show) shown++;
    }
    setCounts(nextCounts);
    setVisible(shown);
    setTotal(rows.length);
  }, [listId, query, status]);

  useEffect(() => {
    apply();
    const list = document.getElementById(listId);
    list?.addEventListener("change", apply);
    return () => list?.removeEventListener("change", apply);
  }, [apply, listId]);

  const chip = (value: string, label: string, n: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setStatus(value)}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
        status === value
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label} {n}
    </button>
  );

  return (
    <div className="sticky top-0 z-10 space-y-2 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc mã..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-base outline-none sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          // Không gửi ô tìm kiếm khi lưu, và Enter không vô tình bấm Lưu
          form="__none__"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {chip("all", "Tất cả", total)}
        {ATTENDANCE_STATUSES.map((st) => chip(st.value, st.label, counts[st.value] ?? 0))}
        {(query || status !== "all") && (
          <span className="shrink-0 text-xs text-slate-500">Đang hiện {visible}/{total}</span>
        )}
      </div>
    </div>
  );
}
