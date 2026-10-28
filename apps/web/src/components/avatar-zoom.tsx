"use client";

import CloseRounded from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Avatar } from "./avatar";
import { avatarUrl } from "@/lib/api-url";

type PhotoProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  version: number | null;
  name: string;
  /** Hiện dưới tên (vd. email tài khoản đã liên kết) */
  caption?: string;
};

/** Hộp xem ảnh đại diện phóng to, dùng chung cho trang Tài khoản và trang nhóm */
export function AvatarPhotoDialog({ open, onClose, userId, version, name, caption }: PhotoProps) {
  return (
    <Dialog
      open={open && !!version}
      onClose={onClose}
      maxWidth="sm"
      slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none", m: 2, overflow: "visible" } } }}
    >
      <Box sx={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={version ? avatarUrl(userId, version) : undefined}
          alt={name}
          style={{ display: "block", width: "min(85vw, 440px)", aspectRatio: "1", objectFit: "cover", borderRadius: 16 }}
        />
        <IconButton
          onClick={onClose}
          aria-label="Đóng"
          sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.45)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.6)" } }}
        >
          <CloseRounded />
        </IconButton>
        <Typography sx={{ color: "#fff", textAlign: "center", mt: 1.5, fontWeight: 600 }}>{name}</Typography>
        {caption && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Dialog>
  );
}

/** Ảnh đại diện bấm được để xem phóng to; chưa có ảnh (chữ cái đầu) thì không bấm được */
export function ZoomableAvatar({
  userId,
  name,
  version,
  size = 28,
  caption,
  insideLink = false,
}: {
  userId: string;
  name: string;
  version: number | null;
  size?: number;
  caption?: string;
  /** Ảnh nằm trong một dòng bấm được (link): bấm ảnh chỉ xem ảnh, không mở link */
  insideLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!version) return <Avatar userId={userId} name={name} version={null} size={size} />;
  const content = (
    <>
      <ButtonBase onClick={() => setOpen(true)} aria-label={`Xem ảnh của ${name}`} sx={{ borderRadius: "50%", flexShrink: 0 }}>
        <Avatar userId={userId} name={name} version={version} size={size} />
      </ButtonBase>
      <AvatarPhotoDialog open={open} onClose={() => setOpen(false)} userId={userId} version={version} name={name} caption={caption} />
    </>
  );
  if (!insideLink) return content;
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex" }}
      onClick={(e) => {
        // Chặn cú bấm (kể cả trong hộp xem ảnh) lan ra link của dòng
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {content}
    </Box>
  );
}
