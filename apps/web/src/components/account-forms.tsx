"use client";

import DeleteOutline from "@mui/icons-material/DeleteOutline";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  changePasswordAction,
  removeAvatarAction,
  updateNameAction,
  updatePreferencesAction,
  uploadAvatarAction,
  type FormState,
} from "@/modules/users/account.actions";
import { Avatar } from "@check-attendance/ui/avatar";
import { AvatarCropper } from "./avatar-cropper";
import { AvatarPhotoDialog } from "@check-attendance/ui/avatar-zoom";
import { PasswordInput } from "@check-attendance/ui/password-input";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { toast } from "@check-attendance/ui/toaster";

/** Thành công: báo bằng thông báo nhỏ; lỗi: hiện ngay trong form */
function useResultToast(state: FormState) {
  useEffect(() => {
    if (state?.ok) toast(state.ok);
  }, [state]);
}

// ---------- Ảnh đại diện ----------

export function AvatarForm({ userId, name, version }: { userId: string; name: string; version: number | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [zoomed, setZoomed] = useState(false);
  const [askRemove, setAskRemove] = useState(false);
  // Ảnh vừa chọn, đang chờ chỉnh khung
  const [picked, setPicked] = useState<File | null>(null);

  const handle = (result: FormState) => {
    if (result?.error) setError(result.error);
    else {
      setError(null);
      if (result?.ok) toast(result.ok);
    }
  };

  const onPick = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    setPicked(file);
  };

  /** Gửi ảnh đã chỉnh lên máy chủ; lỗi thì giữ hộp chỉnh để thử lại */
  const upload = async (cropped: File) => {
    const fd = new FormData();
    fd.append("avatar", cropped);
    const result = await uploadAvatarAction(fd);
    if (result?.error) throw new Error(result.error);
    setPicked(null);
    handle(result);
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

      {/* Chỉnh khung ảnh trước khi lưu */}
      <AvatarCropper file={picked} onCancel={() => setPicked(null)} onConfirm={upload} />

      {/* Xem ảnh phóng to */}
      <AvatarPhotoDialog open={zoomed} onClose={() => setZoomed(false)} userId={userId} version={version} name={name} />

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

/** Công tắc "Nhận email thông báo" (lưu ngay khi bật/tắt) */
export function EmailNotificationsSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <FormControlLabel
      sx={{ alignItems: "flex-start", m: 0, gap: 1.5, width: "100%", justifyContent: "space-between" }}
      labelPlacement="start"
      control={
        <Switch
          checked={on}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            startTransition(async () => {
              const res = await updatePreferencesAction({ notifications: { email: next } }).catch(() => null);
              if (!res) {
                setOn(!next);
                toast("Không lưu được. Vui lòng thử lại.", "error");
                return;
              }
              setOn(res.notifications.email);
              toast(res.notifications.email ? "Đã bật email thông báo" : "Đã tắt email thông báo");
            });
          }}
        />
      }
      label={
        <Box>
          <Typography sx={{ fontWeight: 600 }}>Nhận email thông báo</Typography>
          <Typography variant="body2" color="text.secondary">
            Gửi email khi có người xin nhận tên trong nhóm bạn quản lý.
          </Typography>
        </Box>
      }
    />
  );
}
