"use client";

// Hộp chọn tên cho khuôn mặt chưa nhận ra (hoặc nhận nhầm): mặc định chỉ hiện người chưa điểm danh.
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { NameWithCode } from "@check-attendance/ui/name-with-code";
import { SearchList } from "@check-attendance/ui/search-list";
import { FaceThumb } from "./face-thumb";
import type { FaceMember, Snapshot } from "./types";

type Props = {
  open: boolean;
  reason: "unknown" | "wrong";
  snapshot: Snapshot;
  members: FaceMember[];
  attended: Set<string>;
  onPick: (m: FaceMember) => void;
  onSkip: () => void;
};

/** Nơi dùng đổi key mỗi lượt chọn (ô tìm kiếm, công tắc về mặc định) nhưng giữ nguyên key lúc đóng để hiệu ứng đóng mượt */
export function MemberPicker({ open, reason, snapshot, members, attended, onPick, onSkip }: Props) {
  const [showAll, setShowAll] = useState(false);
  const items = useMemo(() => (showAll ? members : members.filter((m) => !attended.has(m.id))), [attended, members, showAll]);

  return (
    <Dialog
      open={open}
      onClose={onSkip}
      fullWidth
      maxWidth="xs"
      scroll="paper"
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <FaceThumb src={snapshot} />
        <Box>
          <Typography component="span" sx={{ display: "block", fontWeight: 700, fontSize: 17 }}>
            {reason === "wrong" ? "Người này là ai?" : "Chưa nhận ra khuôn mặt"}
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary">
            Chọn tên để ghi Có mặt và lưu khuôn mặt cho lần sau.
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <SearchList
          items={items}
          keyOf={(m) => m.id}
          bare
          emptyText="Mọi người đều đã điểm danh."
          toolbar={
            <FormControlLabel
              control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
              label={<Typography variant="body2">Hiện cả người đã điểm danh</Typography>}
            />
          }
          renderItem={(m, { divider }) => (
            <ListItemButton divider={divider} onClick={() => onPick(m)}>
              <ListItemText
                primary={<NameWithCode name={m.name} code={m.code} />}
                secondary={attended.has(m.id) ? "Đã điểm danh" : undefined}
              />
            </ListItemButton>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onSkip} color="inherit">
          Bỏ qua
        </Button>
      </DialogActions>
    </Dialog>
  );
}
