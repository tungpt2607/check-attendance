import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { FullscreenPanel } from "@check-attendance/ui/fullscreen-panel";
import { Bone } from "@check-attendance/ui/skeleton";

/** Trang trình chiếu QR: phủ toàn màn hình như trang thật, ô vuông lớn giữ chỗ mã QR */
export default function Loading() {
  return (
    <FullscreenPanel busy>
      <Stack spacing={1.5} sx={{ height: "100%", alignItems: "center" }}>
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
    </FullscreenPanel>
  );
}
