import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Logo } from "./logo";

/** Khung chung cho trang đăng nhập/đăng ký */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 2 }}>
      <Logo size={56} />
      <Typography variant="h1" sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {subtitle}
      </Typography>
      <Card>
        <CardContent sx={{ p: 3 }}>{children}</CardContent>
      </Card>
    </Box>
  );
}
