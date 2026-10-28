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

/** Trang hẹp canh giữa (lời mời, tham gia nhóm, tự điểm danh): logo/tiêu đề + danh sách tên */
export function CenteredListSkeleton({ rows = 6, logo = true }: { rows?: number; logo?: boolean }) {
  return (
    <Box sx={{ maxWidth: 440, mx: "auto" }} aria-busy="true" aria-label="Đang tải">
      <Stack spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        {logo && <Bone circle width={44} height={44} />}
        <Bone width={110} height={14} />
        <Bone width={190} height={26} />
      </Stack>
      <Stack spacing={1.5}>
        <Bone height={40} />
        <Card>
          <CardContent>
            <Stack spacing={2}>
              {Array.from({ length: rows }, (_, i) => (
                <Bone key={i} width={i % 3 === 1 ? "70%" : "85%"} height={20} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

/** Trang có thanh tab (trang nhóm): tiêu đề + thanh tab + các thẻ của tab đầu */
export function TabbedPageSkeleton({ tabs = 3, cards = [4] }: { tabs?: number; cards?: number[] }) {
  return (
    <Box aria-busy="true" aria-label="Đang tải">
      <TitleSkeleton />
      <Box sx={{ display: "flex", gap: 2, mb: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        {Array.from({ length: tabs }, (_, i) => (
          <Box key={i} sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Bone width="60%" height={20} />
          </Box>
        ))}
      </Box>
      <Stack spacing={2}>
        {cards.map((n, i) => (
          <CardSkeleton key={i} lines={n} />
        ))}
      </Stack>
    </Box>
  );
}
