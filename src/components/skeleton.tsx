import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

/** Khối xám nhấp nháy giữ chỗ trong lúc trang đang tải */
export function Bone({ width = "100%", height = 20, circle = false }: { width?: number | string; height?: number; circle?: boolean }) {
  return (
    <Skeleton
      variant={circle ? "circular" : "rounded"}
      animation="wave"
      width={width}
      height={height}
    />
  );
}

/** Thẻ trắng chứa vài dòng giữ chỗ */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Bone width={130} height={18} />
          {Array.from({ length: lines }, (_, i) => (
            <Bone key={i} width={i % 2 ? "80%" : "100%"} height={36} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Tiêu đề trang giữ chỗ */
export function TitleSkeleton() {
  return (
    <Stack spacing={1} sx={{ mb: 3 }}>
      <Bone width={100} height={14} />
      <Bone width={200} height={30} />
      <Bone width={230} height={14} />
    </Stack>
  );
}

/** Khung trang đang tải: tiêu đề + các thẻ */
export function PageSkeleton({ cards = [3, 3], narrow = false }: { cards?: number[]; narrow?: boolean }) {
  return (
    <Box sx={{ maxWidth: narrow ? 520 : undefined, mx: "auto" }} aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <Stack spacing={2}>
        {cards.map((n, i) => (
          <CardSkeleton key={i} lines={n} />
        ))}
      </Stack>
    </Box>
  );
}
