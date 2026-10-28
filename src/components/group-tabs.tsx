"use client";

import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Tab, { type TabProps } from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { brand } from "@/theme/brand";
import { useFastTap } from "./use-fast-tap";

/** Chiều cao thanh tiêu đề trên cùng: thanh tab dính ngay dưới */
const STICKY_TOP = 59;
/** Chiều cao thanh tab (44) + đường kẻ dưới */
const TABS_HEIGHT = 45;

export type GroupTab = {
  key: string;
  label: string;
  /** Số hiện trong chấm đỏ (vd. yêu cầu chờ duyệt) */
  badge?: number;
  content: ReactNode;
};

/** Tabs của MUI truyền thêm props (selected, onChange...) vào từng tab: chuyển tiếp hết cho Tab */
function TabButton({ tab, onTap, ...rest }: TabProps & { tab: GroupTab; onTap: () => void }) {
  const tap = useFastTap(onTap);
  return (
    <Tab
      {...rest}
      {...tap}
      value={tab.key}
      sx={{ minHeight: 44, textTransform: "none", fontWeight: 600, fontSize: 15 }}
      label={
        tab.badge ? (
          <Badge badgeContent={tab.badge} color="error" sx={{ "& .MuiBadge-badge": { right: -12, top: 2 } }}>
            {tab.label}
          </Badge>
        ) : (
          tab.label
        )
      }
    />
  );
}

/**
 * Tab dính ngay dưới thanh tiêu đề. Tab đang mở được ghi vào địa chỉ (?tab=...)
 * nên quay lại hoặc tải lại trang vẫn mở đúng tab. Mọi tab đều đã tải sẵn, chuyển tab là hiện ngay.
 */
export function GroupTabs({ tabs, initial }: { tabs: GroupTab[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.key === initial) ? (initial as string) : tabs[0].key);
  const activeRef = useRef(active);
  // Đã đổi tab ít nhất 1 lần: từ đó mới chạy hiệu ứng hiện dần (lúc mới vào trang thì không)
  const [animate, setAnimate] = useState(false);
  // Giữ phần nội dung cao ít nhất 1 màn hình khi đổi tab lúc đang cuộn, để thanh tab đứng yên
  const [hold, setHold] = useState(false);

  // Điểm mốc ngay trên thanh tab: biết vị trí gốc của thanh tab khi nó đang dính
  const anchorRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<number | null>(null);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Vị trí cuộn mà tại đó thanh tab vừa chạm mép dưới thanh tiêu đề */
  const stickPoint = () => {
    const anchor = anchorRef.current;
    return anchor ? anchor.getBoundingClientRect().top + window.scrollY - STICKY_TOP : 0;
  };

  // Đổi tab lúc thanh tab đang dính: đưa về đầu tab mới, ngay dưới thanh tab
  useLayoutEffect(() => {
    if (pendingScroll.current === null) return;
    const top = pendingScroll.current;
    pendingScroll.current = null;
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  }, [active]);

  // Bỏ phần giữ chiều cao khi người dùng đã cuộn về đầu trang
  useEffect(() => {
    if (!hold) return;
    const onScroll = () => {
      if (window.scrollY < 4) setHold(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hold]);

  useEffect(
    () => () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    },
    [],
  );

  const change = (key: string) => {
    if (key === activeRef.current) return;
    activeRef.current = key;

    const point = stickPoint();
    const stuck = window.scrollY > point + 1;
    if (stuck) {
      setHold(true);
      pendingScroll.current = point;
    }
    setAnimate(true);
    setActive(key);

    // Ghi tab vào địa chỉ sau khi màn hình đã đổi xong, để bấm tab phản hồi ngay
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", key);
      window.history.replaceState(window.history.state, "", url);
    }, 400);
  };

  return (
    <>
      <div ref={anchorRef} />
      <Box
        sx={{
          position: "sticky",
          top: STICKY_TOP,
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
            <TabButton key={t.key} value={t.key} tab={t} onTap={() => change(t.key)} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ minHeight: hold ? `calc(100vh - ${STICKY_TOP + TABS_HEIGHT}px)` : undefined }}>
        {tabs.map((t) => (
          <Box
            key={t.key}
            role="tabpanel"
            className={animate ? "ca-fade-in" : undefined}
            sx={{ display: t.key === active ? "block" : "none" }}
          >
            {t.content}
          </Box>
        ))}
      </Box>
    </>
  );
}
