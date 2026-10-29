"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useEffect, useState, useTransition } from "react";
import { createMemberInviteAction } from "@/modules/invites/invite.actions";
import type { ShareLink } from "@check-attendance/shared/api";
import { ShareLinkBox } from "./share-link";

type Props = { memberId: string; name: string; groupName: string; open: boolean; onClose: () => void };

/** Hộp mời thành viên chưa liên kết: mở ra là tạo link riêng để gửi */
export function MemberInviteDialog({ memberId, name, groupName, open, onClose }: Props) {
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

  useEffect(() => {
    if (open) {
      setLink(null);
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
