// Kiểm thử cách tính tỷ lệ chuyên cần (apps/api/src/core/modules/attendance/rate.ts).
// Chạy: npm test -w @check-attendance/api (Node tự bỏ kiểu TypeScript, không cần build)
import assert from "node:assert/strict";
import { test } from "node:test";
import { addStatus, emptyRate, finish, rateOf, ratesByKey } from "../src/core/modules/attendance/rate.ts";

test("chưa có kết quả nào thì tỷ lệ là null", () => {
  assert.deepEqual(rateOf([]), { counts: {}, recorded: 0, rate: null });
  assert.deepEqual(rateOf([null, undefined]), { counts: {}, recorded: 0, rate: null });
});

test("có mặt và muộn đều tính là đến; bỏ qua buổi chưa có kết quả", () => {
  const r = rateOf(["present", "late", "absent", null, "present"]);
  assert.deepEqual(r.counts, { present: 2, late: 1, absent: 1 });
  assert.equal(r.recorded, 4);
  assert.equal(r.rate, 3 / 4);
});

test("cộng số lượt đếm sẵn (aggregation) cho kết quả giống cộng từng lượt", () => {
  const one = finish(addStatus(addStatus(addStatus(emptyRate(), "present"), "present"), "absent"));
  const bulk = finish(addStatus(addStatus(emptyRate(), "present", 2), "absent", 1));
  assert.deepEqual(bulk, one);
});

test("ratesByKey gom theo từng khóa", () => {
  const rows = [
    { member: "a", status: "present" as const, n: 3 },
    { member: "a", status: "absent" as const, n: 1 },
    { member: "b", status: "late" as const, n: 2 },
  ];
  const m = ratesByKey(rows, (r) => [r.member]);
  assert.equal(m.get("a")?.rate, 3 / 4);
  assert.equal(m.get("b")?.rate, 1);
  assert.equal(m.get("c"), undefined);
});

test("ratesByKey: một dòng thuộc nhiều nhánh (nhóm con nằm trong nhánh cha) được cộng vào cả hai", () => {
  // Nhánh "root" chứa nhóm "child"; buổi của child tính cho cả root và child
  const branchOf: Record<string, string[]> = { s1: ["root"], s2: ["root", "child"] };
  const rows = [
    { session: "s1", status: "present" as const, n: 2 },
    { session: "s2", status: "absent" as const, n: 2 },
  ];
  const into = new Map([
    ["root", emptyRate()],
    ["child", emptyRate()],
    ["empty", emptyRate()], // nhánh không có buổi nào vẫn phải được tính xong (rate = null)
  ]);
  const m = ratesByKey(rows, (r) => branchOf[r.session] ?? [], into);
  assert.equal(m.get("root")?.rate, 2 / 4);
  assert.equal(m.get("child")?.rate, 0);
  assert.equal(m.get("empty")?.rate, null);
});
