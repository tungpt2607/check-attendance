import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { FullscreenPanel } from "@check-attendance/ui/fullscreen-panel";
import { Bone } from "@check-attendance/ui/skeleton";

/** Trang điểm danh bằng khuôn mặt: phủ toàn màn hình như trang thật, khối tối giữ chỗ camera */
export default function Loading() {
  return (
    <FullscreenPanel busy maxWidth={560}>
      <Stack spacing={1.5} sx={{ height: "100%", alignItems: "center" }}>
        <Bone width={200} height={20} />
        <Bone width={260} height={14} />
        <Box sx={{ flex: 1, minHeight: 0, width: "100%", borderRadius: 4, bgcolor: "#1f2224" }} />
        <Bone height={40} />
      </Stack>
    </FullscreenPanel>
  );
}
