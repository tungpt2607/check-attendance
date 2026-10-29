"use client";

import FolderOutlined from "@mui/icons-material/FolderOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRef, useState, useTransition } from "react";
import { logoutAction } from "@/modules/auth/auth.actions";
import { brand } from "@check-attendance/ui/brand";
import { Avatar } from "@check-attendance/ui/avatar";

type Props = { userId: string; name: string; email: string; avatarVersion: number | null };

/** Ảnh đại diện trên thanh tiêu đề: bấm mở menu tài khoản */
export function UserMenu({ userId, name, email, avatarVersion }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pending, startTransition] = useTransition();
  const close = () => setAnchor(null);
  const leaving = useRef(false);

  return (
    <>
      <ButtonBase
        aria-label="Tài khoản của tôi"
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: brand.ink,
          borderRadius: 999,
          p: 0.5,
          pr: { xs: 0.5, sm: 1.5 },
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {pending ? (
          <Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center" }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Avatar userId={userId} name={name} version={avatarVersion} size={32} />
        )}
        <Typography component="span" variant="body2" noWrap sx={{ display: { xs: "none", sm: "inline" }, maxWidth: 160 }}>
          {name}
        </Typography>
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 240, maxWidth: "calc(100vw - 32px)", borderRadius: 2, mt: 0.5 } } }}
      >
        {/* Đang đăng nhập bằng tài khoản nào (chỉ xem) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25 }}>
          <Avatar userId={userId} name={name} version={avatarVersion} size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600 }}>
              {name}
            </Typography>
            <Typography noWrap variant="body2" color="text.secondary">
              {email}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <MenuItem component={NextLink} href="/groups" onClick={close} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <FolderOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Nhóm của tôi</ListItemText>
        </MenuItem>
        <MenuItem component={NextLink} href="/account" onClick={close} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <ManageAccountsOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tài khoản</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={pending}
          onClick={() => {
            if (leaving.current) return;
            leaving.current = true;
            close();
            startTransition(async () => {
              await logoutAction();
            });
          }}
          sx={{ py: 1.25, color: brand.red }}
        >
          <ListItemIcon sx={{ color: brand.red }}>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText>Đăng xuất</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
