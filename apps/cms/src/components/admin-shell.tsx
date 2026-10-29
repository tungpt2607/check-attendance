"use client";

// Khung trang quản trị: menu bên trái (máy tính) / menu trượt (điện thoại), thanh trên có tài khoản.
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Avatar } from "@check-attendance/ui/avatar";
import { brand, logoStripe } from "@check-attendance/ui/brand";
import { Logo } from "@check-attendance/ui/logo";
import { logoutAction } from "@/modules/auth.actions";

const DRAWER = 232;

/** Các mục menu (thêm mục mới: thêm vào đây) */
const NAV: { href: string; label: string; icon: SvgIconComponent }[] = [
  { href: "/", label: "Tổng quan", icon: DashboardOutlined },
  { href: "/users", label: "Tài khoản", icon: PeopleAltOutlined },
  { href: "/groups", label: "Nhóm", icon: FolderOutlined },
  { href: "/announcements", label: "Thông báo hệ thống", icon: CampaignOutlined },
  { href: "/system", label: "Hệ thống", icon: SettingsOutlined },
  { href: "/audit", label: "Nhật ký quản trị", icon: HistoryRounded },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  user: { id: string; name: string; email: string; avatarVersion: number | null };
  webUrl: string;
  children: ReactNode;
};

export function AdminShell({ user, webUrl, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [leaving, startLeaving] = useTransition();

  const menu = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ minHeight: 56, gap: 1 }}>
        <Logo size={26} />
        <Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>Điểm danh</Typography>
          <Typography variant="caption" color="text.secondary">
            Quản trị
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1, flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.href}
              component={NextLink}
              href={item.href}
              onClick={() => setOpen(false)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": { bgcolor: brand.tealLighter, color: brand.tealDarker },
                "&.Mui-selected .MuiListItemIcon-root": { color: brand.tealDark },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: active ? 600 : 500, fontSize: 15 } }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1, py: 1 }}>
          <Avatar userId={user.id} name={user.name} version={user.avatarVersion} size={32} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography noWrap variant="caption" color="text.secondary" component="div">
              {user.email}
            </Typography>
          </Box>
        </Box>
        <ListItemButton component="a" href={webUrl} target="_blank" rel="noopener" sx={{ borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <OpenInNewRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Mở web người dùng" slotProps={{ primary: { fontSize: 14 } }} />
        </ListItemButton>
        <ListItemButton
          disabled={leaving}
          onClick={() => startLeaving(async () => logoutAction())}
          sx={{ borderRadius: 2, color: brand.red }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: brand.red }}>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={leaving ? "Đang đăng xuất..." : "Đăng xuất"} slotProps={{ primary: { fontSize: 14 } }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  const current = NAV.find((n) => isActive(pathname, n.href));

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {/* Điện thoại: thanh trên + menu trượt */}
      <AppBar position="fixed" sx={{ display: { md: "none" }, zIndex: 30 }}>
        <Toolbar sx={{ minHeight: 56, gap: 1 }}>
          <IconButton edge="start" aria-label="Mở menu" onClick={() => setOpen(true)} sx={{ color: brand.ink }}>
            <MenuRounded />
          </IconButton>
          <Logo size={24} />
          <Typography noWrap sx={{ fontWeight: 700, color: brand.ink }}>
            {current?.label ?? "Quản trị"}
          </Typography>
        </Toolbar>
        <Box sx={{ display: "flex", height: 3 }} aria-hidden="true">
          {logoStripe.map((c) => (
            <Box key={c} sx={{ flex: 1, bgcolor: c }} />
          ))}
        </Box>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)} sx={{ display: { md: "none" } }} slotProps={{ paper: { sx: { width: DRAWER } } }}>
        {menu}
      </Drawer>

      {/* Máy tính: menu cố định bên trái */}
      <Drawer
        variant="permanent"
        sx={{ display: { xs: "none", md: "block" }, width: DRAWER, flexShrink: 0 }}
        slotProps={{ paper: { sx: { width: DRAWER, borderRight: `1px solid ${brand.border}` } } }}
      >
        {menu}
      </Drawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 4 }, pt: { xs: "83px", md: 4 }, pb: 4 }}>
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
