import { brand } from "../../theme/brand.js";

// Danh sách trạng thái điểm danh. Thêm trạng thái mới (vd. "Vắng có phép") chỉ cần thêm vào đây.
// bg/fg: màu nền nhạt và màu chữ của nhãn (theo 3 màu logo).
export const ATTENDANCE_STATUSES = [
  {
    value: "present",
    label: "Có mặt",
    short: "Có",
    bg: brand.tealLight,
    fg: brand.tealDarker,
  },
  {
    value: "late",
    label: "Muộn",
    short: "Muộn",
    bg: brand.orangeLight,
    fg: brand.orangeDark,
  },
  {
    value: "absent",
    label: "Vắng",
    short: "Vắng",
    bg: brand.redLight,
    fg: brand.redDark,
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
