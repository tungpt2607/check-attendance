// Trạng thái điểm danh khai báo ở gói dùng chung; file này chỉ thêm màu hiển thị cho web.
// bg/fg: màu nền nhạt và màu chữ của nhãn (theo 3 màu logo).
import { STATUS_LABELS, STATUS_VALUES, type AttendanceStatus } from "@check-attendance/shared/statuses";
import { brand } from "@/theme/brand";

export { DEFAULT_STATUS, isAttendanceStatus, isAttended, type AttendanceStatus } from "@check-attendance/shared/statuses";

const COLORS: Record<AttendanceStatus, { bg: string; fg: string }> = {
  present: { bg: brand.tealLight, fg: brand.tealDarker },
  late: { bg: brand.orangeLight, fg: brand.orangeDark },
  absent: { bg: brand.redLight, fg: brand.redDark },
};

export const ATTENDANCE_STATUSES = STATUS_VALUES.map((value) => ({ value, ...STATUS_LABELS[value], ...COLORS[value] }));
