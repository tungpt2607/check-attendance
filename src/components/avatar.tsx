type Props = {
  userId: string;
  name: string;
  /** Phiên bản ảnh; null = chưa có ảnh, hiện chữ cái đầu */
  version: number | null;
  size?: number;
  className?: string;
};

/** Chữ cái đầu của tên (lấy từ cuối, kiểu tên Việt: "Phan Thanh Tùng" -> "T") */
export function initialOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1]?.[0] ?? "?").toUpperCase();
}

export function Avatar({ userId, name, version, size = 32, className = "" }: Props) {
  const style = { width: size, height: size };
  if (version) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${userId}?v=${version}`}
        alt={name}
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={`grid shrink-0 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700 ${className}`}
      aria-label={name}
    >
      {initialOf(name)}
    </span>
  );
}
