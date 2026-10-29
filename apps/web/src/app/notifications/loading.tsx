import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import { Bone, TitleSkeleton } from "@check-attendance/ui/skeleton";

/** Khung chờ trang Thông báo: tiêu đề + thẻ danh sách (ảnh tròn + 2 dòng chữ) */
export default function Loading() {
  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }} aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <Card>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.5 }}>
          <Bone width={110} height={18} />
          <Bone width={150} height={18} />
        </Box>
        {Array.from({ length: 6 }, (_, i) => (
          <Stack key={i} direction="row" spacing={1.5} sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Bone width={40} height={40} circle />
            <Stack spacing={0.75} sx={{ flex: 1 }}>
              <Bone width={i % 2 ? "75%" : "95%"} height={16} />
              <Bone width={80} height={12} />
            </Stack>
          </Stack>
        ))}
      </Card>
    </Box>
  );
}
