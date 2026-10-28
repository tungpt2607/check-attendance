/**
 * Màu thương hiệu OPES (lấy từ logo). Đổi màu toàn hệ thống chỉ cần sửa ở đây.
 * - teal: màu logo, dùng ở chỗ KHÔNG có chữ (thanh tiến trình, viền ô đang nhập, nền nhạt "Có mặt")
 * - tealDark: xanh ngọc đậm cho nút có chữ trắng (đủ tương phản để dễ đọc)
 */
export const brand = {
  teal: "#54B6B9",
  tealDark: "#2A7F82",
  tealDarker: "#1E5759",
  tealLight: "#D5EFEF",
  tealLighter: "#EEF8F8",

  orange: "#E69842",
  orangeDark: "#94541B",
  orangeLight: "#FAE6CF",

  red: "#982726",
  redDark: "#661C1C",
  redLight: "#F6D6D5",

  ink: "#404447",
  inkMuted: "#6B7075",
  onBrand: "#24272A",

  background: "#F6F8F8",
  border: "#E2E6E7",
} as const;

/** Thứ tự 4 màu trong logo, dùng cho dải màu dưới thanh tiêu đề */
export const logoStripe = [brand.orange, brand.ink, brand.teal, brand.red] as const;
