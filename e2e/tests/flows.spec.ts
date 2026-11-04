// Các luồng chính của web người dùng, chạy với web thật + API thật + MongoDB.
import { test } from "@playwright/test";
import { api, expect, groupWithSession, loginAs, newOwner, sessionRows } from "./helpers";

test("đăng ký qua giao diện rồi vào trang nhóm; menu tài khoản hiện phiên bản", async ({ page }) => {
  await page.goto("/register");
  // Ô bắt buộc có dấu * sau nhãn: chọn theo id cho chắc
  await page.locator("#name").fill("Người mới");
  await page.locator("#email").fill(`ui_${Date.now()}@test.local`);
  await page.locator("#password").fill("matkhau123");
  await page.locator("#confirm").fill("matkhau123");
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(page).toHaveURL(/\/groups/);
  await page.locator("header button").last().click();
  await expect(page.getByText(/Phiên bản \d+\.\d+\.\d+ · API \d+\.\d+\.\d+/)).toBeVisible();
});

test("trang nhóm và bảng điểm danh: tìm không dấu, chọn trạng thái, Lưu thì ghi vào database", async ({ page, context }) => {
  const owner = await newOwner();
  const g = await groupWithSession(owner.token, ["An Nguyễn", "Bình Trần", "Chi Lê"]);
  await loginAs(context, owner.token);

  await page.goto(`/groups/${g.groupId}`);
  await expect(page.getByText(/3 thành viên/).first()).toBeVisible();

  await page.goto(`/groups/${g.groupId}/sessions/${g.sessionId}`);
  await expect(page.getByText("Điểm danh bằng khuôn mặt")).toBeVisible();
  await page.getByPlaceholder("Tìm theo tên hoặc mã...").fill("binh");
  await expect(page.locator("li:visible")).toHaveCount(1);
  await expect(page.getByText("Đang hiện 1/3")).toBeVisible();
  await page.getByPlaceholder("Tìm theo tên hoặc mã...").fill("");

  await page.locator("li", { hasText: "Chi Lê" }).getByRole("button", { name: "Muộn" }).click();
  await page.locator("li", { hasText: "An Nguyễn" }).getByRole("button", { name: "Có mặt" }).click();
  await page.getByRole("button", { name: "Lưu điểm danh" }).click();
  await expect(page.getByText("Đã lưu điểm danh")).toBeVisible();

  const rows = await sessionRows(owner.token, g.sessionId);
  expect(rows["Chi Lê"].status).toBe("late");
  expect(rows["An Nguyễn"].status).toBe("present");
  expect(rows["Bình Trần"].status).toBe("absent");

  // Chuyên cần trên trang nhóm tính lại từ database (MongoDB đếm)
  const { members } = await api("GET", `/v1/groups/${g.groupId}/members`, { token: owner.token });
  expect(members.find((m: any) => m.name === "Chi Lê").stats.rate).toBe(1);
  expect(members.find((m: any) => m.name === "Bình Trần").stats.rate).toBe(0);
});

test("tự điểm danh bằng QR: thành viên quét mã, chọn tên, xác nhận", async ({ page, context, browser }) => {
  const owner = await newOwner();
  const g = await groupWithSession(owner.token, ["An Nguyễn", "Bình Trần"]);
  await api("POST", `/v1/sessions/${g.sessionId}/self-checkin/open`, { token: owner.token });
  const qr = await api<{ url: string }>("GET", `/v1/sessions/${g.sessionId}/qr`, { token: owner.token });

  // Thành viên: điện thoại khác, chưa đăng nhập
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await phone.newPage();
  await p.goto(new URL(qr.url).pathname);
  await p.getByPlaceholder("Tìm tên của bạn...").fill("an");
  await p.getByText("An Nguyễn").click();
  await expect(p.getByText("Bạn là An Nguyễn?")).toBeVisible();
  const confirm = p.getByRole("button", { name: "Đúng, điểm danh" });
  // Nút không bị tràn chữ/icon trên màn hình hẹp
  expect(await confirm.evaluate((b) => b.scrollWidth <= b.clientWidth)).toBe(true);
  await confirm.click();
  // Ghi xong, web đặt cookie "điện thoại này đã điểm danh" và trang tự làm mới thành "Bạn đã điểm danh"
  await expect(p.getByText(/Điểm danh thành công|Bạn đã điểm danh/)).toBeVisible();
  await phone.close();

  const rows = await sessionRows(owner.token, g.sessionId);
  expect(rows["An Nguyễn"].status).toBe("present");
  expect(rows["An Nguyễn"].source).toBe("self");

  // Chủ nhóm thấy nhãn "Tự điểm danh" trên bảng
  await loginAs(context, owner.token);
  await page.goto(`/groups/${g.groupId}/sessions/${g.sessionId}`);
  await expect(page.locator("li", { hasText: "An Nguyễn" }).getByText(/Tự điểm danh \d/)).toBeVisible();
});
