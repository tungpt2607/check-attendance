import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { Bone, CardSkeleton, TitleSkeleton } from "@check-attendance/ui/skeleton";

/** Tổng quan: tiêu đề, 5 ô số liệu, thẻ biểu đồ, danh sách tài khoản mới */
export default function Loading() {
  return (
    <Box aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <Stack spacing={2}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i}>
              <CardContent sx={{ p: 2 }}>
                <Bone width={90} height={14} />
                <Box sx={{ mt: 1 }}>
                  <Bone width={60} height={30} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Bone width={160} height={20} />
            <Box sx={{ display: "grid", gap: 3, mt: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
              {Array.from({ length: 3 }, (_, i) => (
                <Bone key={i} height={96} />
              ))}
            </Box>
          </CardContent>
        </Card>
        <CardSkeleton lines={5} />
      </Stack>
    </Box>
  );
}
