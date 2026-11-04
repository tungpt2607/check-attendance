// Thẻ kết quả nằm đè dưới khung camera sau mỗi lượt quét
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { brand } from "@check-attendance/ui/brand";
import { FaceThumb } from "./face-thumb";
import type { CheckedInResult, ScanResult } from "./types";

function detailOf(result: ScanResult): string {
  if (result.kind === "checked_in") return "Đã ghi Có mặt";
  if (result.kind === "already") return "Đã điểm danh trước đó";
  const saved =
    result.faceSaved === "account"
      ? "Đã lưu khuôn mặt vào tài khoản."
      : result.faceSaved === "member"
        ? "Đã lưu khuôn mặt cho lần sau."
        : "Tài khoản đã có khuôn mặt, giữ nguyên.";
  return `${result.already ? "Đã điểm danh trước đó" : "Đã ghi Có mặt"}. ${saved}`;
}

type Props = {
  result: ScanResult;
  /** Nhận nhầm người (chỉ có khi vừa tự nhận ra) */
  onWrong: (r: CheckedInResult) => void;
  onNext: () => void;
};

export function ResultCard({ result, onWrong, onNext }: Props) {
  const ok = result.kind !== "already";
  return (
    <Box sx={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          borderRadius: 3,
          bgcolor: ok ? brand.tealLighter : "#fff",
          border: `1px solid ${ok ? brand.tealLight : brand.border}`,
          boxShadow: 3,
        }}
      >
        <FaceThumb src={result.snapshot} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 0.5 }} noWrap>
            {ok && <CheckCircleRounded sx={{ color: brand.tealDark, fontSize: 22 }} />}
            {result.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {detailOf(result)}
          </Typography>
        </Box>
        {result.kind === "checked_in" ? (
          <Button color="error" variant="outlined" size="small" onClick={() => onWrong(result)} sx={{ flexShrink: 0 }}>
            Sai người
          </Button>
        ) : (
          <Button size="small" onClick={onNext} sx={{ flexShrink: 0 }}>
            Tiếp
          </Button>
        )}
      </Box>
    </Box>
  );
}
