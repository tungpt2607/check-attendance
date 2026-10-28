// Lớp CSS dùng chung, đổi giao diện toàn hệ thống chỉ cần sửa ở đây.
export const ui = {
  card: "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
  /** Thẻ không lề trong, cho nội dung tự canh lề (danh sách dài) */
  cardFlush: "rounded-xl border border-slate-200 bg-white shadow-sm",
  input:
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none sm:text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
  label: "mb-1 block text-sm font-medium text-slate-700",
  btn: "inline-flex items-center justify-center gap-1 rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-60",
  btnGhost:
    "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  btnDanger:
    "inline-flex items-center justify-center gap-1 rounded-lg border border-danger-200 bg-white px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-60",
  h2: "text-base font-semibold text-ink",
  muted: "text-sm text-slate-500",
};
