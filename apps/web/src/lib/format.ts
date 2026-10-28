const TIME_ZONE = "Asia/Ho_Chi_Minh";

/** API trả ngày giờ dạng chuỗi ISO; trong web có chỗ còn dùng Date */
function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (dùng cho input type="date"). */
export function todayInputValue(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/** "YYYY-MM-DD" -> Date (00:00 UTC) để lưu ngày không bị lệch múi giờ. */
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date (lưu 00:00 UTC) -> "YYYY-MM-DD" cho input type="date". */
export function dateInputValue(d: Date | string): string {
  return toDate(d).toISOString().slice(0, 10);
}

export function formatDate(d: Date | string): string {
  return toDate(d).toLocaleDateString("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Giờ:phút theo giờ Việt Nam */
export function formatTime(d: Date | string): string {
  return toDate(d).toLocaleTimeString("vi-VN", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}
