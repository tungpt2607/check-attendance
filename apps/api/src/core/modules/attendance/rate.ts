// Cách tính tỷ lệ chuyên cần, dùng chung cho mọi nơi (chủ nhóm, thành viên tự xem, CMS):
//   tỷ lệ = (có mặt + muộn) / số buổi đã có kết quả.
// Chỉ là phép tính thuần (không đụng database) để dễ kiểm thử: apps/api/test/rate.test.ts.
import type { AttendanceStatus } from "@check-attendance/shared/statuses";

export type Rate = {
  counts: Partial<Record<AttendanceStatus, number>>;
  /** Số lượt đã có kết quả */
  recorded: number;
  /** 0..1; null nếu chưa có kết quả nào */
  rate: number | null;
};

export function emptyRate(): Rate {
  return { counts: {}, recorded: 0, rate: null };
}

/** Cộng n lượt có trạng thái status (n > 1 khi đã đếm sẵn bằng aggregation) */
export function addStatus(r: Rate, status: AttendanceStatus, n = 1): Rate {
  r.counts[status] = (r.counts[status] ?? 0) + n;
  r.recorded += n;
  return r;
}

/** Tính tỷ lệ sau khi đã cộng xong */
export function finish(r: Rate): Rate {
  const attended = (r.counts.present ?? 0) + (r.counts.late ?? 0);
  r.rate = r.recorded > 0 ? attended / r.recorded : null;
  return r;
}

/** Tỷ lệ từ danh sách trạng thái (bỏ qua null = chưa có kết quả) */
export function rateOf(statuses: (AttendanceStatus | null | undefined)[]): Rate {
  const r = emptyRate();
  for (const st of statuses) if (st) addStatus(r, st);
  return finish(r);
}

/**
 * Gom kết quả đếm sẵn (dạng { khóa, trạng thái, số lượt }) thành tỷ lệ theo từng khóa.
 * Một dòng có thể thuộc nhiều khóa (vd. nhóm con nằm trong nhiều nhánh) qua keysOf.
 */
export function ratesByKey<T extends { status: AttendanceStatus; n: number }>(
  rows: T[],
  keysOf: (row: T) => string[],
  into = new Map<string, Rate>(),
): Map<string, Rate> {
  for (const row of rows) {
    for (const key of keysOf(row)) {
      const r = into.get(key) ?? emptyRate();
      addStatus(r, row.status, row.n);
      into.set(key, r);
    }
  }
  for (const r of into.values()) finish(r);
  return into;
}
