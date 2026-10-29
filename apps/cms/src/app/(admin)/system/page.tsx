import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { SystemInfo } from "@check-attendance/shared/admin";
import { brand } from "@check-attendance/ui/brand";
import { AppLink } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";
import { Section } from "@/components/bits";
import { TestEmailForm } from "@/components/test-email-form";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hệ thống · Quản trị Điểm danh" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", py: 0.75, borderBottom: `1px solid ${brand.border}` }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 180, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, flex: 1, fontSize: 14 }}>{children}</Box>
    </Box>
  );
}

/** Trạng thái bật/tắt (biểu tượng + chữ, không chỉ dùng màu) */
function Status({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: on ? brand.tealDark : brand.orangeDark, fontWeight: 600 }}>
      {on ? <CheckCircleRounded sx={{ fontSize: 18 }} /> : <ErrorOutlineRounded sx={{ fontSize: 18 }} />}
      {on ? onText : offText}
    </Box>
  );
}

export default async function SystemPage() {
  const [me, s] = await Promise.all([requireAdmin(), api<SystemInfo>("/v1/admin/system")]);
  return (
    <>
      <PageHeader title="Hệ thống" subtitle="Trạng thái cấu hình và các tính năng" />
      <Stack spacing={2}>
        <Section title="Trạng thái">
          <Row label="Gửi email">
            <Status on={s.features.email} onText="Đang bật" offText="Chưa cấu hình (thiếu SMTP_USER / SMTP_PASS)" />
          </Row>
          <Row label="Địa chỉ gửi email">{s.emailSender ?? "—"}</Row>
          <Row label="Quản trị cố định">{s.adminEmails.length > 0 ? s.adminEmails.join(", ") : "—"}</Row>
          <Row label="Web người dùng">
            <AppLink href={s.webUrl} target="_blank" rel="noopener">
              {s.webUrl}
            </AppLink>
          </Row>
          <Row label="Phiên bản API">{s.version ?? "—"}</Row>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Cấu hình nằm ở biến môi trường của project API trên Vercel; đổi xong phải Redeploy.
          </Typography>
        </Section>

        {s.features.email && (
          <Section title="Gửi email thử">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Kiểm tra chức năng gửi email (quên mật khẩu, email thông báo) có hoạt động không.
            </Typography>
            <TestEmailForm defaultTo={me.email} />
          </Section>
        )}

        <Section title="Nhật ký quản trị">
          <Typography variant="body2">
            Mọi thao tác quản trị (khoá tài khoản, xoá nhóm, gửi thông báo...) đều được ghi lại.{" "}
            <AppLink href="/audit" fontWeight={600}>
              Xem nhật ký
            </AppLink>
          </Typography>
        </Section>
      </Stack>
    </>
  );
}
