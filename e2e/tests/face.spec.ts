// Điểm danh bằng khuôn mặt với camera giả (video ảnh khuôn mặt mẫu) và model thật chạy trên trình duyệt.
import { test, type Browser } from "@playwright/test";
import { TMP } from "../global-setup";
import { api, expect, groupWithSession, loginAs, newOwner, sessionRows, WEB } from "./helpers";

async function cameraPage(playwright: { chromium: { launch: (o: object) => Promise<Browser> } }, video: string, token: string) {
  const browser = await playwright.chromium.launch({
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${TMP}${video}.y4m`],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"], baseURL: WEB });
  await loginAs(context, token);
  return { browser, page: await context.newPage() };
}

test("chưa nhận ra → chọn tên; buổi sau tự nhận ra; Sai người; người khác không bị nhận nhầm", async ({ playwright }) => {
  const owner = await newOwner();
  const g = await groupWithSession(owner.token, ["An Nguyễn", "Bình Trần", "Chi Lê"]);
  const facePage = (sessionId: string) => `/groups/${g.groupId}/sessions/${sessionId}/face`;

  // 1. Lần đầu: chưa có khuôn mặt nào → hộp chọn tên → chọn An (chưa liên kết) → lưu vào thành viên
  let { browser, page } = await cameraPage(playwright, "face-a", owner.token);
  await page.goto(facePage(g.sessionId));
  await expect(page.getByText("Chưa nhận ra khuôn mặt")).toBeVisible({ timeout: 180_000 });
  await page.getByRole("button", { name: /An Nguyễn/ }).click();
  await expect(page.getByText("Đã lưu khuôn mặt cho lần sau")).toBeVisible();
  await browser.close();
  expect((await sessionRows(owner.token, g.sessionId))["An Nguyễn"]).toMatchObject({ status: "present", source: "face" });
  expect((await api("GET", `/v1/members/${g.member["An Nguyễn"]}`, { token: owner.token })).face).toBe("member");

  // 2. Buổi mới: tự nhận ra An → Sai người → chọn Chi
  const s2 = (await api<{ id: string }>("POST", `/v1/groups/${g.groupId}/sessions`, { token: owner.token, body: { title: "Buổi 2", date: "2026-11-05" } })).id;
  ({ browser, page } = await cameraPage(playwright, "face-a", owner.token));
  await page.goto(facePage(s2));
  await expect(page.getByText("Đã ghi Có mặt")).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText("An Nguyễn")).toBeVisible();
  await page.getByRole("button", { name: "Sai người" }).click();
  await expect(page.getByText("Người này là ai?")).toBeVisible();
  // Hoàn tác: về như trước lượt quét (Vắng, vì lượt ghi đầu tiên đã ghi sẵn Vắng cho mọi người)
  expect((await sessionRows(owner.token, s2))["An Nguyễn"].status).toBe("absent");
  await page.getByRole("button", { name: /Chi Lê/ }).click();
  await expect(page.getByText(/Đã ghi Có mặt\. Đã lưu khuôn mặt/)).toBeVisible();
  await browser.close();
  expect((await sessionRows(owner.token, s2))["Chi Lê"]).toMatchObject({ status: "present", source: "face" });

  // 3. Người khác hẳn (ảnh B) không bị nhận nhầm thành An/Chi
  const s3 = (await api<{ id: string }>("POST", `/v1/groups/${g.groupId}/sessions`, { token: owner.token, body: { title: "Buổi 3", date: "2026-11-06" } })).id;
  ({ browser, page } = await cameraPage(playwright, "face-b", owner.token));
  await page.goto(facePage(s3));
  await expect(page.getByText("Chưa nhận ra khuôn mặt")).toBeVisible({ timeout: 180_000 });
  await page.getByRole("button", { name: "Bỏ qua" }).click();
  await browser.close();
  const rows3 = await sessionRows(owner.token, s3);
  expect(Object.values(rows3).every((r) => r.status === null)).toBe(true);
});
