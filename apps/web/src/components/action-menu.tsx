"use client";

import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Fragment, useState, type ReactNode } from "react";
import { brand } from "@/theme/brand";

export type MenuAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Thao tác nguy hiểm (xóa...): chữ đỏ, tách bằng đường kẻ */
  danger?: boolean;
  hidden?: boolean;
};

/** Nút "⋮" mở menu các thao tác */
export function ActionMenu({ actions, label, size = "medium" }: { actions: MenuAction[]; label: string; size?: "small" | "medium" }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <>
      <IconButton size={size} aria-label={label} onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertRounded fontSize={size === "small" ? "small" : "medium"} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2 } } }}
      >
        {visible.map((a, i) => (
          <Fragment key={a.label}>
            {a.danger && i > 0 && !visible[i - 1].danger && <Divider />}
            <MenuItem
              onClick={() => {
                setAnchor(null);
                a.onClick();
              }}
              sx={{ py: 1.25, color: a.danger ? brand.red : undefined }}
            >
              <ListItemIcon sx={{ color: a.danger ? brand.red : undefined }}>{a.icon}</ListItemIcon>
              <ListItemText>{a.label}</ListItemText>
            </MenuItem>
          </Fragment>
        ))}
      </Menu>
    </>
  );
}
