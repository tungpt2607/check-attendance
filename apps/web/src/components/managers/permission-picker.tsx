"use client";

// Chọn quyền cho người quản lý (dùng khi thêm theo email, tạo link mời, sửa quyền) và hiện quyền dạng nhãn.
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GROUP_PERMISSIONS, PERMISSION_INFO, type GroupPermission } from "@check-attendance/shared/permissions";

export function PermissionPicker({ value, onChange }: { value: GroupPermission[]; onChange: (v: GroupPermission[]) => void }) {
  const toggle = (p: GroupPermission, on: boolean) => onChange(GROUP_PERMISSIONS.filter((x) => (x === p ? on : value.includes(x))));
  return (
    <Stack spacing={0.5}>
      {GROUP_PERMISSIONS.map((p) => (
        <FormControlLabel
          key={p}
          sx={{ alignItems: "flex-start", m: 0 }}
          control={<Checkbox checked={value.includes(p)} onChange={(e) => toggle(p, e.target.checked)} sx={{ mt: -0.75 }} />}
          label={
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{PERMISSION_INFO[p].label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {PERMISSION_INFO[p].description}
              </Typography>
            </Box>
          }
        />
      ))}
      <Typography variant="caption" color="text.secondary">
        Người quản lý luôn xem được nhóm (thành viên, buổi, thống kê), kể cả các nhóm con bên trong.
      </Typography>
    </Stack>
  );
}

/** Quyền dạng nhãn nhỏ; không có quyền nào thì ghi "Chỉ xem" */
export function PermissionChips({ permissions }: { permissions: GroupPermission[] }) {
  if (permissions.length === 0) return <Chip size="small" label="Chỉ xem" variant="outlined" />;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {permissions.map((p) => (
        <Chip key={p} size="small" label={PERMISSION_INFO[p].label} />
      ))}
    </Box>
  );
}
