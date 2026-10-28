// Lớp CSS dùng chung, đổi giao diện toàn hệ thống chỉ cần sửa ở đây.
export const ui = {
  card: "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
  /** Thẻ không lề trong, cho nội dung tự canh lề (danh sách dài) */
  cardFlush: "rounded-xl border border-slate-200 bg-white shadow-sm",
  input:
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
  label: "mb-1 block text-sm font-medium text-slate-700",
  btn: "inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60",
  btnGhost:
    "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  btnDanger:
    "inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60",
  h2: "text-base font-semibold text-slate-900",
  muted: "text-sm text-slate-500",
};
