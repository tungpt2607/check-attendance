// Trạng thái điểm danh. Thêm trạng thái mới (vd. "Vắng có phép") chỉ cần thêm vào đây
// (màu hiển thị khai báo riêng ở từng giao diện, vd. apps/web/src/modules/attendance/attendance.statuses.ts).
export const STATUS_VALUES = ["present", "late", "absent"] as const;
export type AttendanceStatus = (typeof STATUS_VALUES)[number];

export const STATUS_LABELS: Record<AttendanceStatus, { label: string; short: string }> = {
  present: { label: "Có mặt", short: "Có" },
  late: { label: "Muộn", short: "Muộn" },
  absent: { label: "Vắng", short: "Vắng" },
};

/** Trạng thái mặc định khi buổi điểm danh mới tạo (chưa lưu lần nào) */
export const DEFAULT_STATUS: AttendanceStatus = "absent";

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return (STATUS_VALUES as readonly unknown[]).includes(value);
}

/** Có mặt hoặc muộn đều tính là đã đến */
export function isAttended(status: AttendanceStatus | null | undefined): boolean {
  return status === "present" || status === "late";
}

// Cách điểm danh. Sau này thêm "qr", "gps"... và xử lý riêng cho từng cách.
export const ATTENDANCE_METHODS = ["manual"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];
