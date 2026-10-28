/** Logo OPES vẽ lại dạng vector: vòng 12 cạnh chia 4 đoạn theo 4 màu thương hiệu. */
const SEGMENTS = [
  { d: "M96.0 48.3 L96.0 37.67 L83.67 16.33 L62.33 4.0 L51.7 4.0 L51.7 16.5 L58.98 16.5 L74.52 25.48 L83.5 41.02 L83.5 48.3Z", color: "#404447" },
  { d: "M48.3 4.0 L37.67 4.0 L16.33 16.33 L4.0 37.67 L4.0 48.3 L16.5 48.3 L16.5 41.02 L25.48 25.48 L41.02 16.5 L48.3 16.5Z", color: "#E69842" },
  { d: "M4.0 51.7 L4.0 62.33 L16.33 83.67 L37.67 96.0 L48.3 96.0 L48.3 83.5 L41.02 83.5 L25.48 74.52 L16.5 58.98 L16.5 51.7Z", color: "#982726" },
  { d: "M51.7 96.0 L62.33 96.0 L83.67 83.67 L96.0 62.33 L96.0 51.7 L83.5 51.7 L83.5 58.98 L74.52 74.52 L58.98 83.5 L51.7 83.5Z", color: "#54B6B9" },
];

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ flexShrink: 0, display: "block" }}
      role="img"
      aria-label="Logo"
    >
      {SEGMENTS.map((s) => (
        <path key={s.color} d={s.d} fill={s.color} stroke={s.color} strokeWidth="1.2" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
