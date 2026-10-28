"use client";

import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import IosShareRounded from "@mui/icons-material/IosShareRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { ShareLink } from "@/modules/invites/share";
import { toast } from "./toaster";

/** Hiện link mời: mã QR, ô link, nút Chia sẻ (Zalo, Messenger...) và Sao chép */
export function ShareLinkBox({ link, shareTitle, showQr = true }: { link: ShareLink; shareTitle: string; showQr?: boolean }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast("Đã sao chép link");
    } catch {
      toast("Không sao chép được, hãy giữ vào ô link để sao chép", "error");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: shareTitle, text: shareTitle, url: link.url });
    } catch {
      // Người dùng đóng bảng chia sẻ: không cần báo gì
    }
  };

  return (
    <Stack spacing={1.5}>
      {showQr && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.qrDataUrl} alt="Mã QR của link mời" style={{ width: 200, height: 200 }} />
        </Box>
      )}
      <TextField
        value={link.url}
        slotProps={{ htmlInput: { readOnly: true }, input: { sx: { fontSize: 14 } } }}
        onFocus={(e) => e.target.select()}
      />
      <Stack direction="row" spacing={1}>
        {canShare && (
          <Button variant="contained" startIcon={<IosShareRounded />} onClick={share} sx={{ flex: 1 }}>
            Chia sẻ
          </Button>
        )}
        <Button variant={canShare ? "outlined" : "contained"} color={canShare ? "inherit" : "primary"} startIcon={<ContentCopyRounded />} onClick={copy} sx={{ flex: 1 }}>
          Sao chép
        </Button>
      </Stack>
      {link.expiresAt && (
        <Typography variant="caption" color="text.secondary">
          Link dùng 1 lần, hết hạn {new Date(link.expiresAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}.
        </Typography>
      )}
    </Stack>
  );
}
