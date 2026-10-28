"use client";

import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { createMemberInviteAction, type ShareLink } from "@/modules/invites/invite.actions";
import { ShareLinkBox } from "./share-link";

/** Nút "Mời" cạnh thành viên chưa liên kết: tạo link riêng và hiện để gửi */
export function MemberInviteButton({ memberId, name, groupName }: { memberId: string; name: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const res = await createMemberInviteAction(memberId);
      if (res.ok) setLink(res.link);
      else setError(res.error);
    });

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Mời ${name} liên kết tài khoản`}
        onClick={() => {
          setOpen(true);
          setLink(null);
          generate();
        }}
      >
        <PersonAddAltRounded fontSize="small" />
      </IconButton>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600, pb: 0.5 }}>Mời liên kết tài khoản</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gửi link này cho <b>{name}</b>. Người nhận đăng nhập (hoặc đăng ký) rồi xác nhận là được liên kết ngay.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {pending && !link && (
            <Box sx={{ display: "grid", placeItems: "center", height: 200 }}>
              <CircularProgress />
            </Box>
          )}
          {link && <ShareLinkBox link={link} shareTitle={`Liên kết tài khoản điểm danh nhóm ${groupName}`} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Button color="inherit" disabled={pending} onClick={generate}>
            Tạo link mới
          </Button>
          <Button onClick={() => setOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
