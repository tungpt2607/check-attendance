"use client";

import LinkRounded from "@mui/icons-material/LinkRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { createGroupInviteAction, disableGroupInviteAction } from "@/modules/invites/invite.actions";
import type { ShareLink } from "@/modules/invites/share";
import { ShareLinkBox } from "./share-link";
import { toast } from "./toaster";

type Props = { groupId: string; groupName: string; initialLink: ShareLink | null };

/** Link chung để mọi người tự chọn tên mình và xin liên kết tài khoản (chủ nhóm duyệt) */
export function GroupInviteCard({ groupId, groupName, initialLink }: Props) {
  const [link, setLink] = useState<ShareLink | null>(initialLink);
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
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: 2 }}>
          <LinkRounded color="primary" sx={{ mt: 0.25 }} />
          <Box>
            <Typography variant="h2">Link tham gia nhóm</Typography>
            <Typography variant="body2" color="text.secondary">
              Gửi một link cho cả nhóm. Mỗi người đăng nhập, chọn tên mình, bạn duyệt là liên kết xong.
            </Typography>
          </Box>
        </Box>

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
      </CardContent>

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
    </Card>
  );
}
