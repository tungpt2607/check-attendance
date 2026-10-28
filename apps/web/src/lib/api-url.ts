// Địa chỉ backend API. File này không dùng gì của máy chủ nên component phía trình duyệt cũng nạp được.
// Đặt NEXT_PUBLIC_API_URL trên Vercel nếu đổi tên miền API.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://check-attendance-api.vercel.app").replace(/\/+$/, "");

/** Ảnh đại diện lấy thẳng từ API (công khai, lưu đệm lâu dài theo phiên bản ảnh) */
export function avatarUrl(userId: string, version: number) {
  return `${API_URL}/v1/users/${userId}/avatar?v=${version}`;
}
