import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { Bone } from "@check-attendance/ui/skeleton";

/** Lời mời riêng: thẻ giữa trang có logo, tên nhóm, câu hỏi xác nhận và 2 nút */
export default function Loading() {
  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 2 }} aria-busy="true" aria-label="Đang tải">
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.25} sx={{ alignItems: "center" }}>
            <Bone circle width={48} height={48} />
            <Bone width={100} height={14} />
            <Bone width={170} height={24} />
            <Bone width={220} height={22} />
            <Bone width="90%" height={14} />
            <Stack direction="row" spacing={1} sx={{ width: "100%", pt: 1.5 }}>
              <Bone height={40} />
              <Bone height={40} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
