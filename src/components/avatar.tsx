import MuiAvatar from "@mui/material/Avatar";
import { brand } from "@/theme/brand";

type Props = {
  userId: string;
  name: string;
  /** Phiên bản ảnh; null = chưa có ảnh, hiện chữ cái đầu */
  version: number | null;
  size?: number;
};

/** Chữ cái đầu của tên (lấy từ cuối, kiểu tên Việt: "Phan Thanh Tùng" -> "T") */
export function initialOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1]?.[0] ?? "?").toUpperCase();
}

export function Avatar({ userId, name, version, size = 32 }: Props) {
  return (
    <MuiAvatar
      src={version ? `/api/avatar/${userId}?v=${version}` : undefined}
      alt={name}
      sx={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        bgcolor: brand.tealLight,
        color: brand.tealDarker,
      }}
    >
      {initialOf(name)}
    </MuiAvatar>
  );
}
