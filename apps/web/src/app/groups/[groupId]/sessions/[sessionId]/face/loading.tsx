import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { Bone } from "@check-attendance/ui/skeleton";
import { brand } from "@check-attendance/ui/brand";

/** Trang điểm danh bằng khuôn mặt: phủ toàn màn hình như trang thật, khối tối giữ chỗ camera */
export default function Loading() {
  return (
    <Box
      sx={{ position: "fixed", inset: 0, zIndex: 1300, bgcolor: brand.background, px: 2, pt: 2, pb: 3 }}
      aria-busy="true"
      aria-label="Đang tải"
    >
      <Stack spacing={1.5} sx={{ maxWidth: 560, mx: "auto", height: "100%", alignItems: "center" }}>
        <Bone width={200} height={20} />
        <Bone width={260} height={14} />
        <Box sx={{ flex: 1, minHeight: 0, width: "100%", borderRadius: 4, bgcolor: "#1f2224" }} />
        <Bone height={40} />
      </Stack>
    </Box>
  );
}
