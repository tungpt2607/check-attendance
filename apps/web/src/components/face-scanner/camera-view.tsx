// Khung camera: video + lớp vẽ khung khuôn mặt + các nhãn/lớp phủ nằm đè lên (truyền qua children).
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type { ReactNode, RefObject } from "react";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  /** Camera trước: lật ngang như soi gương */
  mirrored: boolean;
  children?: ReactNode;
};

export function CameraView({ videoRef, overlayRef, mirrored, children }: Props) {
  const flip = mirrored ? "scaleX(-1)" : undefined;
  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        borderRadius: 4,
        overflow: "hidden",
        bgcolor: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box component="video" ref={videoRef} playsInline muted autoPlay sx={{ width: "100%", height: "100%", objectFit: "contain", transform: flip }} />
      <Box
        component="canvas"
        ref={overlayRef}
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", transform: flip }}
      />
      {children}
    </Box>
  );
}

const PILL = { bgcolor: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 99 } as const;

/** Nhãn nền tối bo tròn nằm đè lên camera; placement: góc trên trái hoặc giữa phía dưới */
export function CameraPill({ placement, children }: { placement: "top-left" | "bottom"; children: ReactNode }) {
  const at =
    placement === "top-left"
      ? { top: 10, left: 10, fontWeight: 700 }
      : { bottom: 12, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" };
  return <Box sx={{ position: "absolute", px: 1.5, py: 0.5, fontSize: 14, ...PILL, ...at }}>{children}</Box>;
}

/** Nút tròn nhỏ nền tối ở góc trên phải của camera */
export const cameraButtonSx = { position: "absolute", top: 8, right: 8, minWidth: 0, p: 1, ...PILL } as const;

/** Lớp phủ đang tải/đang nhận diện */
export function CameraBusy({ text }: { text: string }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: "rgba(0,0,0,0.35)" }}>
      <Box sx={{ textAlign: "center", color: "#fff" }}>
        <CircularProgress color="inherit" />
        <Typography sx={{ mt: 1 }}>{text}</Typography>
      </Box>
    </Box>
  );
}

/** Lớp phủ báo lỗi không chạy tiếp được (không có camera, không tải được model...) */
export function CameraError({ text }: { text: string }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", p: 3 }}>
      <Alert severity="error">{text}</Alert>
    </Box>
  );
}
