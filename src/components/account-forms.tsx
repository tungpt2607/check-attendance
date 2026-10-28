"use client";

import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
import { toast } from "./toaster";

/** Thành công: báo bằng thông báo nhỏ; lỗi: hiện ngay trong form */
function useResultToast(state: FormState) {
  useEffect(() => {
    if (state?.ok) toast(state.ok);
  }, [state]);
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [zoomed, setZoomed] = useState(false);
  const [askRemove, setAskRemove] = useState(false);

  const handle = (result: FormState) => {
    if (result?.error) setError(result.error);
    else {
      setError(null);
      if (result?.ok) toast(result.ok);
    }
  };

  const onPick = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const small = await shrinkToSquare(file);
        const fd = new FormData();
        fd.append("avatar", small);
        handle(await uploadAvatarAction(fd));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được ảnh.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <ButtonBase
          onClick={() => version && setZoomed(true)}
          disabled={!version}
          aria-label="Xem ảnh lớn"
          sx={{ borderRadius: "50%" }}
        >
          <Avatar userId={userId} name={name} version={version} size={72} />
        </ButtonBase>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Button
            variant="contained"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraOutlined />}
          >
            {pending ? "Đang xử lý..." : version ? "Đổi ảnh" : "Chọn ảnh"}
          </Button>
          {version && (
            <Button
              variant="outlined"
              color="inherit"
              disabled={pending}
              startIcon={<DeleteOutline />}
              onClick={() => setAskRemove(true)}
            >
              Xóa ảnh
            </Button>
          )}
        </Stack>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Xem ảnh phóng to */}
      <Dialog
        open={zoomed && !!version}
        onClose={() => setZoomed(false)}
        maxWidth="sm"
        slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none", m: 2, overflow: "visible" } } }}
      >
        <Box sx={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/avatar/${userId}?v=${version}`}
            alt={name}
            style={{ display: "block", width: "min(85vw, 440px)", aspectRatio: "1", objectFit: "cover", borderRadius: 16 }}
          />
          <IconButton
            onClick={() => setZoomed(false)}
            aria-label="Đóng"
            sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.45)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.6)" } }}
          >
            <CloseRounded />
          </IconButton>
          <Typography sx={{ color: "#fff", textAlign: "center", mt: 1.5, fontWeight: 500 }}>{name}</Typography>
        </Box>
      </Dialog>

      {/* Xác nhận xóa ảnh */}
      <Dialog open={askRemove} onClose={() => setAskRemove(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Xóa ảnh đại diện?</Typography>
          <Typography color="text.secondary" variant="body2">Ảnh sẽ được thay bằng chữ cái đầu của tên bạn.</Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 3 }}>
            <Button color="inherit" onClick={() => setAskRemove(false)}>Hủy</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setAskRemove(false);
                startTransition(async () => handle(await removeAvatarAction()));
              }}
            >
              Xóa ảnh
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </Stack>
  );
}

// ---------- Họ tên ----------

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateNameAction, undefined);
  useResultToast(state);
  return (
    <form action={action}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <TextField id="name" name="name" label="Họ tên" defaultValue={name} required slotProps={{ htmlInput: { maxLength: 80 } }} />
          <SubmitButton pendingText="Đang lưu..." sx={{ flexShrink: 0, height: 40 }}>
            Lưu
          </SubmitButton>
        </Stack>
        {state?.error && <Alert severity="error">{state.error}</Alert>}
      </Stack>
    </form>
  );
}

// ---------- Mật khẩu ----------

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  useResultToast(state);
  return (
    <form action={action}>
      <Stack spacing={2}>
        <PasswordInput id="current" name="current" label="Mật khẩu hiện tại" required autoComplete="current-password" />
        <PasswordInput id="next" name="next" label="Mật khẩu mới" required minLength={6} autoComplete="new-password" />
        <PasswordInput id="confirm" name="confirm" label="Nhập lại mật khẩu mới" required minLength={6} autoComplete="new-password" />
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        {state?.ok && <Alert severity="success">{state.ok}</Alert>}
        <Box>
          <SubmitButton pendingText="Đang đổi...">Đổi mật khẩu</SubmitButton>
        </Box>
      </Stack>
    </form>
  );
}
