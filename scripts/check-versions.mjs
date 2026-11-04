#!/usr/bin/env node
// Kiểm tra mỗi PR vào main đã tăng phiên bản cho phần có thay đổi (web, CMS, API).
// Chạy: node scripts/check-versions.mjs <nhánh gốc, vd. origin/main>
// - Mỗi phần có phiên bản riêng trong apps/<phần>/package.json (semver X.Y.Z, tăng thủ công).
// - Sửa code dùng chung thì phải tăng mọi phần dùng nó: packages/shared → web, CMS, API; packages/ui → web, CMS.
// - Chỉ sửa tài liệu (*.md) thì không cần tăng.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const APPS = [
  { key: "web", label: "Web người dùng", dir: "apps/web", uses: ["packages/shared", "packages/ui"] },
  { key: "cms", label: "CMS quản trị", dir: "apps/cms", uses: ["packages/shared", "packages/ui"] },
  { key: "api", label: "API", dir: "apps/api", uses: ["packages/shared"] },
];

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** a > b theo semver (chỉ X.Y.Z) */
export function isGreater(a, b) {
  const pa = SEMVER.exec(a);
  const pb = SEMVER.exec(b);
  if (!pa || !pb) return false;
  for (let i = 1; i <= 3; i++) {
    if (Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) > Number(pb[i]);
  }
  return false;
}

/** Phần nào bị ảnh hưởng bởi danh sách file thay đổi */
export function affectedApps(files) {
  const code = files.filter((f) => !f.endsWith(".md"));
  const touches = (dir) => code.some((f) => f.startsWith(`${dir}/`));
  return APPS.filter((app) => touches(app.dir) || app.uses.some(touches));
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function versionAt(ref, dir) {
  try {
    return JSON.parse(git("show", `${ref}:${dir}/package.json`)).version ?? null;
  } catch {
    return null; // phần mới, chưa có ở nhánh gốc
  }
}

function main() {
  const base = process.argv[2];
  if (!base) {
    console.error("Cách dùng: node scripts/check-versions.mjs <nhánh gốc, vd. origin/main>");
    process.exit(2);
  }
  const files = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
  const errors = [];
  for (const app of affectedApps(files)) {
    const before = versionAt(base, app.dir);
    const now = JSON.parse(readFileSync(`${app.dir}/package.json`, "utf8")).version;
    if (!SEMVER.test(now ?? "")) {
      errors.push(`${app.label}: phiên bản "${now}" trong ${app.dir}/package.json không đúng dạng X.Y.Z.`);
    } else if (before && !isGreater(now, before)) {
      errors.push(
        `${app.label} có thay đổi nhưng chưa tăng phiên bản (vẫn ${now}). ` +
          `Sửa "version" trong ${app.dir}/package.json: sửa lỗi → tăng số cuối, tính năng mới → tăng số giữa, thay đổi lớn → tăng số đầu.`,
      );
    } else {
      console.log(`✓ ${app.label}: ${before ?? "(mới)"} → ${now}`);
    }
  }
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    // Chú thích lỗi hiện ngay trên GitHub (tab Checks của PR)
    if (process.env.GITHUB_ACTIONS) for (const e of errors) console.log(`::error title=Chưa tăng phiên bản::${e}`);
    process.exit(1);
  }
  if (affectedApps(files).length === 0) console.log("Không có phần nào thay đổi code: không cần tăng phiên bản.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
