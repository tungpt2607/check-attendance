"use client";

import { useMemo, useState, useTransition } from "react";
import { normalizeSearch } from "@/lib/search";
import { selfCheckInAction } from "@/modules/attendance/checkin.actions";

export type CheckInMember = { id: string; name: string; code: string; checkedIn: boolean };

type Props = { sessionId: string; token: string; members: CheckInMember[] };

export function CheckInList({ sessionId, token, members }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CheckInMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return members;
    return members.filter((m) => normalizeSearch(`${m.name} ${m.code}`).includes(q));
  }, [members, query]);

  if (doneName) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-3xl text-white">✓</div>
        <p className="text-lg font-semibold text-emerald-900">Điểm danh thành công</p>
        <p className="mt-1 text-emerald-800">{doneName}</p>
      </div>
    );
  }

  const confirm = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await selfCheckInAction(sessionId, token, selected.id);
      if (res.ok) setDoneName(res.name);
      else setError(res.error);
    });
  };

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm tên của bạn..."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

      {error && !selected && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Không tìm thấy tên phù hợp.</li>}
        {filtered.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              disabled={m.checkedIn}
              onClick={() => {
                setError(null);
                setSelected(m);
              }}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <span className={m.checkedIn ? "text-slate-400" : "font-medium text-slate-800"}>
                {m.code && <span className="mr-2 text-xs text-slate-400">{m.code}</span>}
                {m.name}
              </span>
              {m.checkedIn && <span className="shrink-0 text-xs text-emerald-600">Đã điểm danh</span>}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-sm text-slate-500">Xác nhận điểm danh</p>
            <p className="mt-1 text-lg font-semibold">Bạn là {selected.name}?</p>
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Không phải
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {pending ? "Đang ghi..." : "Đúng, điểm danh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
