// Quyết định kết quả so khớp khuôn mặt (hàm thuần, kiểm thử ở apps/api/test/face-match.test.ts).
// Model face-api (giống dlib) huấn luyện chủ yếu trên khuôn mặt phương Tây: với khuôn mặt châu Á, người KHÁC nhau
// thường gần nhau hơn, ngưỡng 0.5–0.6 hay nhận nhầm. Vì vậy chỉ tự ghi khi thật chắc, lưng chừng thì hỏi lại.

/** Dưới ngưỡng này (và không có người thứ hai gần ngang) mới tự ghi Có mặt */
export const CONFIDENT_DISTANCE = 0.4;
/** Từ CONFIDENT_DISTANCE tới đây: hỏi chủ nhóm "Có phải X?"; từ đây trở lên: coi như chưa nhận ra */
export const MAX_DISTANCE = 0.5;
/** Người giống thứ hai phải xa hơn người giống nhất ít nhất ngần này, không thì hỏi lại (hai người na ná nhau) */
export const MIN_MARGIN = 0.08;

export type MatchDecision<T> =
  | { kind: "confident"; item: T; distance: number }
  | { kind: "uncertain"; item: T; distance: number }
  | { kind: "none" };

/** candidates: khoảng cách nhỏ nhất của TỪNG người (mỗi người một dòng) */
export function decideMatch<T>(candidates: { item: T; distance: number }[]): MatchDecision<T> {
  const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
  const [best, second] = sorted;
  if (!best || best.distance >= MAX_DISTANCE) return { kind: "none" };
  const clearWinner = !second || second.distance - best.distance >= MIN_MARGIN;
  if (best.distance < CONFIDENT_DISTANCE && clearWinner) return { kind: "confident", item: best.item, distance: best.distance };
  return { kind: "uncertain", item: best.item, distance: best.distance };
}
