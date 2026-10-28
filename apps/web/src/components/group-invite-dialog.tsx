"use client";

import LinkRounded from "@mui/icons-material/LinkRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { createGroupInviteAction, disableGroupInviteAction } from "@/modules/invites/invite.actions";
import type { ShareLink } from "@/lib/api-types";
import { ShareLinkBox } from "./share-link";
import { toast } from "./toaster";

type Props = {
  groupId: string;
  groupName: string;
  /** Link đang bật (null: đang tắt). Trạng thái giữ ở component cha để hiện nhãn "đang bật" bên ngoài */
  link: ShareLink | null;
  onLinkChange: (link: ShareLink | null) => void;
  open: boolean;
  onClose: () => void;
};

/** Link chung để mọi người tự chọn tên mình và xin liên kết tài khoản (chủ nhóm duyệt) */
export function GroupInviteDialog({ groupId, groupName, link, onLinkChange: setLink, open, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<"rotate" | "disable" | null>(null);
  const [pending, startTransition] = useTransition();

  const create = (message: string) =>
    startTransition(async () => {
      setError(null);
      const res = await createGroupInviteAction(groupId);
      if (res.ok) {
        setLink(res.link);
        toast(message);
      } else setError(res.error);
    });

  const disable = () =>
    startTransition(async () => {
      await disableGroupInviteAction(groupId);
      setLink(null);
      toast("Đã tắt link tham gia");
    });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 18, fontWeight: 600, pb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
        <LinkRounded color="primary" />
        Link tham gia nhóm
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gửi một link cho cả nhóm. Mỗi người đăng nhập, chọn tên mình, bạn duyệt là liên kết xong.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {link ? (
          <Stack spacing={1.5}>
            <ShareLinkBox link={link} shareTitle={`Tham gia nhóm điểm danh ${groupName}`} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button color="inherit" size="small" disabled={pending} onClick={() => setAsk("rotate")}>
                Tạo link mới
              </Button>
              <Button color="error" size="small" disabled={pending} onClick={() => setAsk("disable")}>
                Tắt link
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Button
            variant="contained"
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <LinkRounded />}
            onClick={() => create("Đã bật link tham gia")}
          >
            {pending ? "Đang tạo..." : "Bật link tham gia"}
          </Button>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>

      <Dialog open={ask !== null} onClose={() => setAsk(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>{ask === "rotate" ? "Tạo link mới?" : "Tắt link tham gia?"}</Typography>
          <DialogContentText>
            {ask === "rotate"
              ? "Link cũ sẽ không dùng được nữa. Yêu cầu đang chờ duyệt vẫn giữ nguyên."
              : "Không ai dùng link này để gửi yêu cầu được nữa. Yêu cầu đang chờ duyệt vẫn giữ nguyên."}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setAsk(null)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color={ask === "disable" ? "error" : "primary"}
            onClick={() => {
              const what = ask;
              setAsk(null);
              if (what === "rotate") create("Đã tạo link mới");
              else disable();
            }}
          >
            {ask === "rotate" ? "Tạo link mới" : "Tắt link"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
