"use client";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useMemo, useState, useTransition } from "react";
import { normalizeSearch } from "@/lib/search";
import { selfCheckInAction } from "@/modules/attendance/checkin.actions";
import { brand } from "@/theme/brand";

export type CheckInMember = {
  id: string;
  name: string;
  code: string;
  checkedIn: boolean;
  /** Tên đã liên kết tài khoản: phải đăng nhập đúng tài khoản mới điểm danh được */
  locked: boolean;
};

type Props = {
  sessionId: string;
  token: string;
  members: CheckInMember[];
  /** Trang đăng nhập, đăng nhập xong quay lại đúng trang điểm danh này */
  loginHref: string;
  /** Email đang đăng nhập (nếu có) — khi đó tên có ổ khóa là của tài khoản khác */
  loggedInEmail?: string | null;
};

/** Ô báo điểm danh thành công (dùng cả ở trang khi điện thoại đã điểm danh trước đó) */
export function CheckInDone({ title, name }: { title: string; name?: string }) {
  return (
    <Box sx={{ borderRadius: 4, bgcolor: brand.tealLighter, border: `1px solid ${brand.tealLight}`, p: 4, textAlign: "center" }}>
      <CheckCircleRounded sx={{ fontSize: 64, color: brand.tealDark }} />
      <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 1 }}>{title}</Typography>
      {name && <Typography sx={{ mt: 0.5, color: brand.tealDarker }}>{name}</Typography>}
    </Box>
  );
}

export function CheckInList({ sessionId, token, members, loginHref, loggedInEmail }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CheckInMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  // Tên đã liên kết tài khoản vừa được bấm: hiện hộp hướng dẫn đăng nhập
  const [lockedMember, setLockedMember] = useState<CheckInMember | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return members;
    return members.filter((m) => normalizeSearch(`${m.name} ${m.code}`).includes(q));
  }, [members, query]);

  if (doneName) return <CheckInDone title="Điểm danh thành công" name={doneName} />;

  const close = () => {
    if (pending) return;
    setSelected(null);
    setError(null);
  };

  const confirm = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await selfCheckInAction(sessionId, token, selected.id);
      if (res.ok) setDoneName(res.name);
      else setError(res.error);
    });
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm tên của bạn..."
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {error && !selected && <Alert severity="error">{error}</Alert>}

      <Card>
        <List disablePadding>
          {filtered.length === 0 && (
            <Typography sx={{ py: 3, textAlign: "center" }} variant="body2" color="text.secondary">
              Không tìm thấy tên phù hợp.
            </Typography>
          )}
          {filtered.map((m, i) => (
            <ListItemButton
              key={m.id}
              divider={i < filtered.length - 1}
              disabled={m.checkedIn}
              onClick={() => {
                setError(null);
                if (m.locked) setLockedMember(m);
                else setSelected(m);
              }}
              sx={{ py: 1.5, "&.Mui-disabled": { opacity: 1 } }}
            >
              <ListItemText
                primary={
                  <>
                    {m.code && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        {m.code}
                      </Typography>
                    )}
                    {m.name}
                  </>
                }
                slotProps={{
                  primary: { fontWeight: m.checkedIn || m.locked ? 400 : 600, color: m.checkedIn || m.locked ? "text.disabled" : "text.primary" },
                }}
              />
              {!m.checkedIn && m.locked && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
                >
                  <LockOutlined sx={{ fontSize: 15 }} /> Cần đăng nhập
                </Typography>
              )}
              {m.checkedIn && (
                <Typography
                  variant="caption"
                  sx={{ color: brand.tealDark, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
                >
                  <CheckCircleRounded sx={{ fontSize: 16 }} /> Đã điểm danh
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>
      </Card>

      {/* Tên đã liên kết tài khoản: hướng dẫn đăng nhập */}
      <Dialog
        open={!!lockedMember}
        onClose={() => setLockedMember(null)}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }}
      >
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 19, display: "flex", alignItems: "center", gap: 1 }}>
            <LockOutlined sx={{ color: brand.tealDark }} /> {lockedMember?.name}
          </Typography>
          {loggedInEmail ? (
            <Typography sx={{ mt: 1 }}>
              Tên này đã liên kết với một tài khoản khác. Bạn đang đăng nhập bằng <b>{loggedInEmail}</b> nên không điểm danh
              được cho tên này.
            </Typography>
          ) : (
            <>
              <Typography sx={{ mt: 1 }}>Tên này đã liên kết tài khoản. Hãy đăng nhập đúng tài khoản đó để điểm danh.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Nếu báo mã hết hạn, hãy quét lại mã trên màn hình.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" color="inherit" fullWidth onClick={() => setLockedMember(null)}>
            {loggedInEmail ? "Đóng" : "Hủy"}
          </Button>
          {!loggedInEmail && (
            <Button variant="contained" fullWidth component={NextLink} href={loginHref}>
              Đăng nhập
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Xác nhận đúng người */}
      <Dialog
        open={!!selected}
        onClose={close}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }}
      >
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Xác nhận điểm danh
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 19, mt: 0.5 }}>Bạn là {selected?.name}?</Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" color="inherit" fullWidth disabled={pending} onClick={close}>
            Không phải
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={pending}
            onClick={confirm}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <CheckCircleRounded />}
          >
            {pending ? "Đang ghi..." : "Đúng, điểm danh"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/** Người đã đăng nhập và đã liên kết: chỉ một nút điểm danh cho chính mình */
export function SelfCheckInButton({ sessionId, token, memberId, name }: { sessionId: string; token: string; memberId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  // Tên đã liên kết tài khoản vừa được bấm: hiện hộp hướng dẫn đăng nhập
  const [lockedMember, setLockedMember] = useState<CheckInMember | null>(null);
  const [pending, startTransition] = useTransition();

  if (doneName) return <CheckInDone title="Điểm danh thành công" name={doneName} />;

  return (
    <Card>
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Bạn đang đăng nhập với tên
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 20, mt: 0.5 }}>{name}</Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={pending}
          sx={{ mt: 2.5, py: 1.5, fontSize: 17 }}
          startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRounded />}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await selfCheckInAction(sessionId, token, memberId);
              if (res.ok) setDoneName(res.name);
              else setError(res.error);
            })
          }
        >
          {pending ? "Đang ghi..." : "Điểm danh"}
        </Button>
      </Box>
    </Card>
  );
}
