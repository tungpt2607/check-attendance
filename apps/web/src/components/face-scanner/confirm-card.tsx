// Khuôn mặt giống nhưng chưa chắc: hỏi chủ nhóm "Có phải X?" trước khi ghi (tránh nhận nhầm người)
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { brand } from "@check-attendance/ui/brand";
import { FaceThumb } from "./face-thumb";
import type { Snapshot } from "./types";

type Props = { name: string; snapshot: Snapshot; onYes: () => void; onNo: () => void };

export function ConfirmCard({ name, snapshot, onYes, onNo }: Props) {
  return (
    <Box sx={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: "#fff", border: `1px solid ${brand.orangeLight}`, boxShadow: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FaceThumb src={snapshot} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <HelpOutlineRounded sx={{ fontSize: 18, color: brand.orangeDark }} /> Chưa chắc chắn
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 18 }} noWrap>
              Có phải {name}?
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.25 }}>
          <Button variant="outlined" color="inherit" onClick={onNo}>
            Không phải
          </Button>
          <Button variant="contained" onClick={onYes}>
            Đúng
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
