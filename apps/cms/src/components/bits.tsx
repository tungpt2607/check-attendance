// Mảnh giao diện nhỏ dùng nhiều nơi trong CMS
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { brand } from "@check-attendance/ui/brand";
import { SectionTitle } from "@check-attendance/ui/page-header";

/** Thẻ có tiêu đề */
export function Section({ title, extra, children, flush }: { title: ReactNode; extra?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5, ...(flush ? { pb: "8px !important" } : {}) }}>
        <SectionTitle extra={extra}>{title}</SectionTitle>
        {children}
      </CardContent>
    </Card>
  );
}

/** Ô số liệu lớn */
export function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, mt: 0.5, color: brand.ink }}>
          {value.toLocaleString("vi-VN")}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
      {children}
    </Typography>
  );
}

/** Nhãn trạng thái tài khoản: quản trị (cố định/được cấp), đã khoá */
export function UserBadges({ role, roleSource, disabled }: { role: "user" | "admin"; roleSource: "db" | "env"; disabled: boolean }) {
  return (
    <Box component="span" sx={{ display: "inline-flex", gap: 0.5, flexWrap: "wrap", verticalAlign: "middle" }}>
      {role === "admin" && (
        <Chip size="small" label={roleSource === "env" ? "Quản trị cố định" : "Quản trị"} sx={{ bgcolor: brand.tealLight, color: brand.tealDarker, fontWeight: 600 }} />
      )}
      {disabled && <Chip size="small" label="Đã khoá" sx={{ bgcolor: brand.redLight, color: brand.redDark, fontWeight: 600 }} />}
    </Box>
  );
}

/** Tỷ lệ chuyên cần: ≥80% xanh, 50–79% cam, <50% đỏ, chưa có "—" (cùng ngưỡng với web người dùng) */
export function RateText({ rate }: { rate: number | null }) {
  if (rate === null) return <Typography component="span" color="text.disabled">—</Typography>;
  const color = rate >= 0.8 ? brand.tealDark : rate >= 0.5 ? brand.orangeDark : brand.red;
  return (
    <Typography component="span" sx={{ color, fontWeight: 600 }}>
      {Math.round(rate * 100)}%
    </Typography>
  );
}
