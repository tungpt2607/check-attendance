// Người quản lý nhóm qua giao diện: chủ nhóm thêm theo email (chọn quyền), quản lý chỉ thấy nút được phép,
// mời bằng link và nhận lời, chuyển quyền chủ nhóm.
import { test, type Browser } from "@playwright/test";
import { api, expect, groupWithSession, loginAs, newOwner } from "./helpers";

async function as(browser: Browser, token: string) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await loginAs(context, token);
  return { context, page: await context.newPage() };
}

test("chủ nhóm thêm quản lý theo email; quản lý chỉ thấy việc được phép", async ({ browser }) => {
  const owner = await newOwner("Chủ nhóm");
  const mgr = await newOwner("Cô giáo");
  const g = await groupWithSession(owner.token, ["An Nguyễn", "Bình Trần"]);

  // Chủ nhóm: menu ⋮ → Người quản lý → Thêm quản lý (theo email, mặc định quyền Điểm danh)
  const o = await as(browser, owner.token);
  await o.page.goto(`/groups/${g.groupId}`);
  await o.page.getByRole("button", { name: "Thao tác với nhóm" }).click();
  await o.page.getByRole("menuitem", { name: "Người quản lý" }).click();
  await expect(o.page).toHaveURL(new RegExp(`/groups/${g.groupId}/managers`));
  await o.page.getByRole("button", { name: "Thêm quản lý" }).click();
  await o.page.getByRole("combobox", { name: "Email tài khoản" }).fill(mgr.email);
  await o.page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(o.page.getByText("Cô giáo")).toBeVisible();
  // Nhãn quyền (chữ "Điểm danh" cũng có ở logo trên thanh tiêu đề nên tìm trong nhãn)
  const chip = (page: typeof o.page, text: string) => page.locator(".MuiChip-label", { hasText: new RegExp(`^${text}$`) });
  await expect(chip(o.page, "Điểm danh")).toBeVisible();

  // Quản lý: thấy nhóm với nhãn "Quản lý"; được điểm danh, không được thêm thành viên / tạo buổi / sửa buổi
  const m = await as(browser, mgr.token);
  await m.page.goto("/groups");
  await expect(m.page.locator(".MuiChip-label", { hasText: /^Quản lý$/ })).toBeVisible();
  await m.page.goto(`/groups/${g.groupId}/sessions/${g.sessionId}`);
  await expect(m.page.getByRole("button", { name: "Mở QR" })).toBeVisible();
  await expect(m.page.getByRole("button", { name: "Lưu điểm danh" })).toBeVisible();
  await expect(m.page.getByRole("button", { name: "Thao tác với buổi điểm danh" })).toHaveCount(0);
  await m.page.goto(`/groups/${g.groupId}?tab=members`);
  await expect(m.page.getByText(/Thành viên \(2\)/)).toBeVisible();
  await expect(m.page.getByRole("button", { name: "Thêm thành viên" })).toHaveCount(0);
  await m.page.goto(`/groups/${g.groupId}`);
  await expect(m.page.getByRole("button", { name: "Bắt đầu điểm danh" })).toHaveCount(0);

  // Chủ nhóm sửa quyền: thêm "Buổi điểm danh" → quản lý thấy nút tạo buổi
  await o.page.getByRole("button", { name: "Thao tác với Cô giáo" }).click();
  await o.page.getByRole("menuitem", { name: "Sửa quyền" }).click();
  await o.page.getByLabel(/Buổi điểm danh/).check();
  await o.page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(chip(o.page, "Buổi điểm danh")).toBeVisible();
  await m.page.reload();
  await expect(m.page.getByRole("button", { name: "Bắt đầu điểm danh" })).toBeVisible();
  await o.context.close();
  await m.context.close();
});

test("mời quản lý bằng link: người nhận đăng nhập và nhận lời", async ({ browser }) => {
  const owner = await newOwner("Chủ nhóm");
  const guest = await newOwner("Người được mời");
  const g = await groupWithSession(owner.token, ["An Nguyễn"]);

  const o = await as(browser, owner.token);
  await o.page.goto(`/groups/${g.groupId}/managers`);
  await o.page.getByRole("button", { name: "Thêm quản lý" }).click();
  await o.page.getByRole("tab", { name: "Bằng link mời" }).click();
  await o.page.getByLabel(/Thành viên/).check();
  await o.page.getByRole("button", { name: "Tạo link mời" }).click();
  const url = await o.page.locator("input[readonly]").first().inputValue();
  expect(url).toMatch(/\/manage\//);

  const gpage = await as(browser, guest.token);
  await gpage.page.goto(new URL(url).pathname);
  await expect(gpage.page.getByText("Chủ nhóm mời bạn làm người quản lý nhóm")).toBeVisible();
  await expect(gpage.page.locator(".MuiChip-label", { hasText: /^Thành viên$/ })).toBeVisible();
  await gpage.page.getByRole("button", { name: "Nhận lời" }).click();
  await expect(gpage.page).toHaveURL(new RegExp(`/groups/${g.groupId}$`));

  // Link dùng 1 lần
  await gpage.page.goto(new URL(url).pathname);
  await expect(gpage.page.getByText("Link mời đã được dùng.")).toBeVisible();

  await o.page.goto(`/groups/${g.groupId}/managers`);
  await expect(o.page.getByText("Người được mời")).toBeVisible();
  await o.context.close();
  await gpage.context.close();
});

test("chuyển quyền chủ nhóm qua giao diện", async ({ browser }) => {
  const owner = await newOwner("Chủ cũ");
  const next = await newOwner("Chủ mới");
  const g = await groupWithSession(owner.token, ["An Nguyễn"]);

  const o = await as(browser, owner.token);
  await o.page.goto(`/groups/${g.groupId}/managers`);
  await o.page.getByRole("button", { name: "Chuyển chủ nhóm" }).click();
  await o.page.getByRole("combobox", { name: "Email chủ nhóm mới" }).fill(next.email);
  await o.page.getByRole("button", { name: "Chuyển", exact: true }).click();
  await expect(o.page.getByText("Chủ mới")).toBeVisible();
  // Chủ cũ ở lại làm quản lý: không còn nút thêm quản lý
  await expect(o.page.getByRole("button", { name: "Thêm quản lý" })).toHaveCount(0);

  const d = await api("GET", `/v1/groups/${g.groupId}`, { token: next.token });
  expect(d.access.role).toBe("owner");
  await o.context.close();
});
