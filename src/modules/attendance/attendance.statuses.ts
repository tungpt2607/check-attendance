// Danh sách trạng thái điểm danh. Thêm trạng thái mới (vd. "Vắng có phép") chỉ cần thêm vào đây.
export const ATTENDANCE_STATUSES = [
  {
    value: "present",
    label: "Có mặt",
    short: "Có",
    className: "bg-brand-100 text-brand-800",
    checkedClass: "has-checked:bg-brand-100 has-checked:text-brand-800",
  },
  {
    value: "late",
    label: "Muộn",
    short: "Muộn",
    className: "bg-warn-100 text-warn-800",
    checkedClass: "has-checked:bg-warn-100 has-checked:text-warn-800",
  },
  {
    value: "absent",
    label: "Vắng",
    short: "Vắng",
    className: "bg-danger-100 text-danger-800",
    checkedClass: "has-checked:bg-danger-100 has-checked:text-danger-800",
  },
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]["value"];

/** Trạng thái mặc định khi buổi điểm danh mới tạo (chưa lưu lần nào). */
export const DEFAULT_STATUS: AttendanceStatus = "absent";

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return ATTENDANCE_STATUSES.some((s) => s.value === value);
}

// Cách điểm danh. Sau này thêm "qr", "gps"... và xử lý riêng cho từng cách.
export const ATTENDANCE_METHODS = ["manual"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];
