import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { getSession } from "@/lib/session";
import { brand, logoStripe } from "@/theme/brand";
import { AppLink } from "./links";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

/** Dải mảnh 4 màu của logo chạy dưới thanh tiêu đề */
function BrandStripe() {
  return (
    <Box sx={{ display: "flex", height: 3 }} aria-hidden="true">
      {logoStripe.map((c) => (
        <Box key={c} sx={{ flex: 1, bgcolor: c }} />
      ))}
    </Box>
  );
}

export async function AppHeader() {
  const user = await getSession();
  return (
    <AppBar position="sticky" sx={{ zIndex: 30 }}>
      <Toolbar sx={{ width: "100%", maxWidth: 1000, mx: "auto", minHeight: { xs: 56, sm: 56 }, px: 2, justifyContent: "space-between" }}>
        <AppLink
          href={user ? "/groups" : "/login"}
          underline="none"
          sx={{ display: "flex", alignItems: "center", gap: 1, color: brand.ink }}
        >
          <Logo size={28} />
          <Typography component="span" sx={{ fontWeight: 700, fontSize: 17 }}>
            Điểm danh
          </Typography>
        </AppLink>
        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <NotificationBell />
            <UserMenu userId={user.userId} name={user.name} email={user.email} avatarVersion={user.avatarVersion} />
          </Box>
        )}
      </Toolbar>
      <BrandStripe />
    </AppBar>
  );
}
