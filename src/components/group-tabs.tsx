"use client";

import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useState, type ReactNode } from "react";
import { brand } from "@/theme/brand";

export type GroupTab = {
  key: string;
  label: string;
  /** Số hiện trong chấm đỏ (vd. yêu cầu chờ duyệt) */
  badge?: number;
  content: ReactNode;
};

/**
 * Tab dính ngay dưới thanh tiêu đề. Tab đang mở được ghi vào địa chỉ (?tab=...)
 * nên quay lại hoặc tải lại trang vẫn mở đúng tab. Mọi tab đều đã tải sẵn, chuyển tab là hiện ngay.
 */
export function GroupTabs({ tabs, initial }: { tabs: GroupTab[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.key === initial) ? (initial as string) : tabs[0].key);

  const change = (key: string) => {
    setActive(key);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 59,
          zIndex: 20,
          bgcolor: brand.background,
          mx: -2,
          px: 1,
          mb: 2,
          borderBottom: `1px solid ${brand.border}`,
        }}
      >
        <Tabs value={active} onChange={(_e, v: string) => change(v)} variant="fullWidth" sx={{ minHeight: 44 }}>
          {tabs.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              sx={{ minHeight: 44, textTransform: "none", fontWeight: 600, fontSize: 15 }}
              label={
                t.badge ? (
                  <Badge badgeContent={t.badge} color="error" sx={{ "& .MuiBadge-badge": { right: -12, top: 2 } }}>
                    {t.label}
                  </Badge>
                ) : (
                  t.label
                )
              }
            />
          ))}
        </Tabs>
      </Box>
      {tabs.map((t) => (
        <Box key={t.key} role="tabpanel" sx={{ display: t.key === active ? "block" : "none" }}>
          {t.content}
        </Box>
      ))}
    </>
  );
}
