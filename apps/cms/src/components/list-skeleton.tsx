import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { Bone, TitleSkeleton } from "@check-attendance/ui/skeleton";

/** Khung chờ cho trang danh sách: tiêu đề, ô tìm kiếm (tùy chọn), các dòng có ảnh tròn */
export function ListPageSkeleton({ search = true, rows = 8, avatar = true }: { search?: boolean; rows?: number; avatar?: boolean }) {
  return (
    <Box aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          {search && (
            <Box sx={{ mb: 2 }}>
              <Bone height={40} />
            </Box>
          )}
          <Stack spacing={1.5}>
            {Array.from({ length: rows }, (_, i) => (
              <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                {avatar && <Bone circle width={36} height={36} />}
                <Stack spacing={0.75} sx={{ flex: 1 }}>
                  <Bone width={i % 2 ? "45%" : "60%"} height={16} />
                  <Bone width={i % 2 ? "65%" : "40%"} height={12} />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
