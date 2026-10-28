import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { getSession } from "@/lib/session";
import { brand, logoStripe } from "@/theme/brand";
import { Avatar } from "./avatar";
import { AppLink } from "./links";
import { Logo } from "./logo";

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
          <AppLink
            href="/account"
            underline="none"
            aria-label="Tài khoản của tôi"
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
            <Avatar userId={user.userId} name={user.name} version={user.avatarVersion} size={32} />
            <Typography
              component="span"
              variant="body2"
              noWrap
              sx={{ display: { xs: "none", sm: "inline" }, maxWidth: 160 }}
            >
              {user.name}
            </Typography>
          </AppLink>
        )}
      </Toolbar>
      <BrandStripe />
    </AppBar>
  );
}
