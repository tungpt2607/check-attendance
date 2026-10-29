import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { Bone } from "@check-attendance/ui/skeleton";
import { brand } from "@check-attendance/ui/brand";

/** Trang trình chiếu QR: phủ toàn màn hình như trang thật, ô vuông lớn giữ chỗ mã QR */
export default function Loading() {
  return (
    <Box
      sx={{ position: "fixed", inset: 0, zIndex: 1300, bgcolor: brand.background, px: 2, pt: 2, pb: 3 }}
      aria-busy="true"
      aria-label="Đang tải"
    >
      <Stack spacing={1.5} sx={{ maxWidth: 520, mx: "auto", height: "100%", alignItems: "center" }}>
        <Bone width={200} height={20} />
        <Bone width={260} height={14} />
        <Box sx={{ flex: 1, minHeight: 0, width: "100%", display: "grid", placeItems: "center" }}>
          <Box sx={{ width: "min(100%, 60vh)", aspectRatio: "1", borderRadius: 2, bgcolor: "#E6ECEC" }} />
        </Box>
        <Bone height={8} />
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
          <Bone height={40} />
          <Bone height={40} />
        </Stack>
      </Stack>
    </Box>
  );
}
