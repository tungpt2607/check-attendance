import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { AppLink } from "./links";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Liên kết quay lại phía trên tiêu đề */
  back?: { href: string; label: string };
  /** Nút thao tác bên phải tiêu đề */
  actions?: ReactNode;
};

/** Tiêu đề trang thống nhất: quay lại, tên trang, mô tả ngắn, nút thao tác */
export function PageHeader({ title, subtitle, back, actions }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      {back && (
        <AppLink
          href={back.href}
          color="text.secondary"
          variant="body2"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 1 }}
        >
          <ArrowBackRounded sx={{ fontSize: 16 }} />
          {back.label}
        </AppLink>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
        <Box sx={{ minWidth: 0, flex: "1 1 0" }}>
          <Typography variant="h1" sx={{ wordBreak: "break-word" }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{actions}</Box>}
      </Box>
    </Box>
  );
}

/** Thẻ nội dung có tiêu đề nhỏ */
export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2 }}>
      <Typography variant="h2">{children}</Typography>
      {extra}
    </Box>
  );
}
