"use client";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
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
import { useMemo, useState, useTransition } from "react";
import { normalizeSearch } from "@/lib/search";
import { selfCheckInAction } from "@/modules/attendance/checkin.actions";
import { brand } from "@/theme/brand";

export type CheckInMember = { id: string; name: string; code: string; checkedIn: boolean };

type Props = { sessionId: string; token: string; members: CheckInMember[] };

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

export function CheckInList({ sessionId, token, members }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CheckInMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
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
                setSelected(m);
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
                slotProps={{ primary: { fontWeight: m.checkedIn ? 400 : 600, color: m.checkedIn ? "text.disabled" : "text.primary" } }}
              />
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
