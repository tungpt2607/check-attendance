"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  changePasswordAction,
  removeAvatarAction,
  updateNameAction,
  uploadAvatarAction,
  type FormState,
} from "@/modules/users/account.actions";
import { Avatar } from "./avatar";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";
import { ui } from "./ui";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</p>;
  return null;
}

// ---------- Ảnh đại diện ----------

/** 512px để ảnh phóng to vẫn nét; JPEG khoảng 50–100KB */
const AVATAR_SIZE = 512;

/** Cắt vuông ở giữa và thu nhỏ ảnh ngay trên máy, trả về file JPEG nhẹ. */
async function shrinkToSquare(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không đọc được ảnh"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh"))), "image/jpeg", 0.85),
    );
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarForm({ userId, name, version }: { userId: string; name: string; version: number | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();
  const [zoomed, setZoomed] = useState(false);

  // Đóng ảnh phóng to bằng phím Esc (trên máy tính)
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const small = await shrinkToSquare(file);
        const fd = new FormData();
        fd.append("avatar", small);
        setState(await uploadAvatarAction(fd));
      } catch (e) {
        setState({ error: e instanceof Error ? e.message : "Không tải được ảnh." });
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {version ? (
          <button type="button" onClick={() => setZoomed(true)} aria-label="Xem ảnh lớn" className="rounded-full">
            <Avatar userId={userId} name={name} version={version} size={72} />
          </button>
        ) : (
          <Avatar userId={userId} name={name} version={version} size={72} />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} className={ui.btn}>
            {pending ? "Đang tải lên..." : version ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
          {version && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (window.confirm("Xóa ảnh đại diện?")) setState(await removeAvatarAction());
                })
              }
              className={ui.btnGhost}
            >
              Xóa ảnh
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
      <Message state={state} />

      {zoomed && version && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh đại diện"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900/85 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/avatar/${userId}?v=${version}`}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="aspect-square w-full max-w-sm rounded-2xl object-cover shadow-2xl sm:max-w-md"
          />
          <p className="text-sm text-white/80">{name}</p>
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white hover:bg-white/25"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Họ tên ----------

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateNameAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className={ui.label} htmlFor="name">Họ tên</label>
      <div className="flex gap-2">
        <input id="name" name="name" defaultValue={name} required maxLength={80} className={ui.input} />
        <SubmitButton pendingText="Đang lưu..." className="shrink-0">Lưu</SubmitButton>
      </div>
      <Message state={state} />
    </form>
  );
}

// ---------- Mật khẩu ----------

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={ui.label} htmlFor="current">Mật khẩu hiện tại</label>
        <PasswordInput id="current" name="current" required autoComplete="current-password" />
      </div>
      <div>
        <label className={ui.label} htmlFor="next">Mật khẩu mới</label>
        <PasswordInput id="next" name="next" required minLength={6} autoComplete="new-password" />
      </div>
      <div>
        <label className={ui.label} htmlFor="confirm">Nhập lại mật khẩu mới</label>
        <PasswordInput id="confirm" name="confirm" required minLength={6} autoComplete="new-password" />
      </div>
      <Message state={state} />
      <SubmitButton pendingText="Đang đổi...">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
