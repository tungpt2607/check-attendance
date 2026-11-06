// Kiểm thử quyết định so khớp khuôn mặt (apps/api/src/core/modules/faces/match.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIDENT_DISTANCE, MAX_DISTANCE, decideMatch } from "../src/core/modules/faces/match.ts";

const c = (item: string, distance: number) => ({ item, distance });

test("chưa có ai lưu khuôn mặt: không nhận ra", () => {
  assert.deepEqual(decideMatch([]), { kind: "none" });
});

test("rất giống và chỉ một người: tự ghi", () => {
  assert.deepEqual(decideMatch([c("tuyet", 0.2)]), { kind: "confident", item: "tuyet", distance: 0.2 });
});

test("chỉ một người đã lưu nhưng giống lưng chừng (lỗi cũ: ai cũng ra người đó): hỏi lại, không tự ghi", () => {
  // Trước đây ngưỡng 0.5 → 0.45 bị ghi luôn là Đỗ Ánh Tuyết
  assert.equal(decideMatch([c("tuyet", 0.45)]).kind, "uncertain");
  assert.equal(decideMatch([c("tuyet", CONFIDENT_DISTANCE)]).kind, "uncertain");
});

test("xa từ MAX_DISTANCE trở lên: không nhận ra", () => {
  assert.equal(decideMatch([c("tuyet", MAX_DISTANCE)]).kind, "none");
  assert.equal(decideMatch([c("tuyet", 0.9)]).kind, "none");
});

test("hai người na ná nhau (cách nhau ít): hỏi lại dù người gần nhất rất giống", () => {
  const d = decideMatch([c("a", 0.3), c("b", 0.33)]);
  assert.equal(d.kind, "uncertain");
  assert.equal(d.kind !== "none" && d.item, "a");
});

test("người gần nhất rõ ràng hơn người thứ hai: tự ghi đúng người gần nhất", () => {
  assert.deepEqual(decideMatch([c("b", 0.6), c("a", 0.25)]), { kind: "confident", item: "a", distance: 0.25 });
});
