/** Chuẩn hóa chuỗi để tìm kiếm: chữ thường, bỏ dấu tiếng Việt, gộp khoảng trắng. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
