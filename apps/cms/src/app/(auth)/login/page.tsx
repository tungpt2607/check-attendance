import Box from "@mui/material/Box";
import { AuthShell } from "@check-attendance/ui/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Đăng nhập · Quản trị Điểm danh" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function Page({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <Box sx={{ px: 2, py: 4 }}>
      <AuthShell title="Trang quản trị" subtitle="Đăng nhập bằng tài khoản quản trị của Điểm danh.">
        <LoginForm
          next={target}
          notice={error === "forbidden" ? "Tài khoản vừa đăng nhập không còn quyền quản trị." : undefined}
        />
      </AuthShell>
    </Box>
  );
}
