import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LinkButton } from "@/components/links";

export default function NotFound() {
  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8, textAlign: "center" }}>
      <Typography variant="h1">Không tìm thấy</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Trang không tồn tại hoặc bạn không có quyền truy cập.
      </Typography>
      <LinkButton href="/groups" variant="contained" sx={{ mt: 3 }}>
        Về danh sách nhóm
      </LinkButton>
    </Box>
  );
}
