"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  changePasswordAction,
  removeAvatarAction,
  updateNameAction,
  uploadAvatarAction,
  type FormState,
} from "@/modules/users/account.actions";
import { Avatar } from "./avatar";
import { SubmitButton } from "./submit-button";
import { ui } from "./ui";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</p>;
  return null;
}

// ---------- Ảnh đại diện ----------

const AVATAR_SIZE = 256;

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
        <Avatar userId={userId} name={name} version={version} size={72} />
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
        <input id="current" name="current" type="password" required autoComplete="current-password" className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="next">Mật khẩu mới</label>
        <input id="next" name="next" type="password" required minLength={6} autoComplete="new-password" className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="confirm">Nhập lại mật khẩu mới</label>
        <input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" className={ui.input} />
      </div>
      <Message state={state} />
      <SubmitButton pendingText="Đang đổi...">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
