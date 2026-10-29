import Typography from "@mui/material/Typography";
import { LinkButton } from "@check-attendance/ui/links";
import { PageHeader } from "@check-attendance/ui/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Không tìm thấy" subtitle="Tài khoản hoặc nhóm này không tồn tại (có thể đã bị xoá)." />
      <Typography sx={{ mb: 2 }} />
      <LinkButton href="/" variant="contained">
        Về Tổng quan
      </LinkButton>
    </>
  );
}
