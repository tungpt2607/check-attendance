"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export type MemberSort = "name" | "rate";

/** Chọn cách xếp danh sách thành viên: theo tên hoặc chuyên cần thấp → cao (ghi vào ?sort=) */
export function MemberSortToggle({ value }: { value: MemberSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      disabled={pending}
      onChange={(_e, v: MemberSort | null) => {
        if (!v || v === value) return;
        const params = new URLSearchParams(window.location.search);
        params.set("tab", "members");
        if (v === "name") params.delete("sort");
        else params.set("sort", v);
        startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
      }}
      sx={{ "& .MuiToggleButton-root": { textTransform: "none", py: 0.25, px: 1.25, fontSize: 13 } }}
    >
      <ToggleButton value="name">Theo tên</ToggleButton>
      <ToggleButton value="rate">Chuyên cần thấp</ToggleButton>
    </ToggleButtonGroup>
  );
}
