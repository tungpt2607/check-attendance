import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { Bone } from "@/components/skeleton";

/** Trang quên mật khẩu: logo, tiêu đề, thẻ form (1 ô email + nút) */
export default function Loading() {
  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 2 }} aria-busy="true" aria-label="Đang tải">
      <Bone circle width={56} height={56} />
      <Stack spacing={1} sx={{ mt: 2, mb: 3 }}>
        <Bone width={180} height={30} />
        <Bone width={280} height={16} />
      </Stack>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Bone height={40} />
            <Bone height={44} />
            <Bone width={160} height={16} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
