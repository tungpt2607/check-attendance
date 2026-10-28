// Danh sách trạng thái điểm danh. Thêm trạng thái mới (vd. "Vắng có phép") chỉ cần thêm vào đây.
export const ATTENDANCE_STATUSES = [
  {
    value: "present",
    label: "Có mặt",
    short: "Có",
    className: "bg-emerald-100 text-emerald-800",
    checkedClass: "has-checked:bg-emerald-100 has-checked:text-emerald-800",
  },
  {
    value: "late",
    label: "Muộn",
    short: "Muộn",
    className: "bg-amber-100 text-amber-800",
    checkedClass: "has-checked:bg-amber-100 has-checked:text-amber-800",
  },
  {
    value: "absent",
    label: "Vắng",
    short: "Vắng",
    className: "bg-rose-100 text-rose-800",
    checkedClass: "has-checked:bg-rose-100 has-checked:text-rose-800",
  },
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]["value"];

export const DEFAULT_STATUS: AttendanceStatus = "present";

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return ATTENDANCE_STATUSES.some((s) => s.value === value);
}

// Cách điểm danh. Sau này thêm "qr", "gps"... và xử lý riêng cho từng cách.
export const ATTENDANCE_METHODS = ["manual"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];
