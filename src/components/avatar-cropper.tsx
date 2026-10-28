"use client";

import ZoomInRounded from "@mui/icons-material/ZoomInRounded";
import ZoomOutRounded from "@mui/icons-material/ZoomOutRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Cạnh ảnh lưu lên máy chủ: đủ nét khi xem phóng to trên màn hình điện thoại */
export const AVATAR_SIZE = 1024;
/** Máy chủ nhận tối đa 600KB; chừa một chút */
const MAX_BYTES = 580 * 1024;
const MAX_ZOOM = 4;

type Pos = { x: number; y: number; zoom: number };

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Không đọc được ảnh"));
    el.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh"))), "image/jpeg", quality),
  );
}

function newCanvas(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

/**
 * Cắt vùng vuông đã chọn rồi thu nhỏ dần (mỗi lần một nửa) về 1024px để ảnh mịn, không răng cưa.
 * Nặng quá thì giảm chất lượng JPEG cho vừa giới hạn.
 */
async function renderCrop(img: HTMLImageElement, sx: number, sy: number, side: number): Promise<File> {
  // Bước đầu: lấy vùng đã chọn ở cỡ gốc (giới hạn 4096 để không vượt bộ nhớ của iPhone)
  let size = Math.round(Math.min(side, 4096));
  let { c, ctx } = newCanvas(size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  const target = Math.min(AVATAR_SIZE, size);
  while (size / 2 >= target) {
    const half = Math.round(size / 2);
    const next = newCanvas(half);
    next.ctx.drawImage(c, 0, 0, size, size, 0, 0, half, half);
    c = next.c;
    size = half;
  }
  if (size !== target) {
    const last = newCanvas(target);
    last.ctx.drawImage(c, 0, 0, size, size, 0, 0, target, target);
    c = last.c;
  }

  let blob = await toBlob(c, 0.88);
  for (const q of [0.8, 0.72, 0.64]) {
    if (blob.size <= MAX_BYTES) break;
    blob = await toBlob(c, q);
  }
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

type Props = {
  /** Ảnh vừa chọn; null là đóng hộp */
  file: File | null;
  onCancel: () => void;
  /** Gửi ảnh đã cắt lên máy chủ; xong thì hộp tự đóng (do component cha đặt file = null) */
  onConfirm: (cropped: File) => Promise<void>;
};

/** Hộp chỉnh ảnh đại diện: kéo để đặt khuôn mặt vào khung tròn, chụm 2 ngón hoặc kéo thanh trượt để phóng to */
export function AvatarCropper({ file, onCancel, onConfirm }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState(0);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0, zoom: 1 });

  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ pos: Pos; dist: number; midX: number; midY: number } | null>(null);

  // Đọc ảnh đã chọn
  useEffect(() => {
    setImg(null);
    setError(null);
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    loadImage(u)
      .then((el) => {
        setImg(el);
        setPos({ x: 0, y: 0, zoom: 1 });
      })
      .catch((e: Error) => setError(e.message));
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // Đo cạnh khung chỉnh (vuông, theo bề ngang hộp thoại)
  useLayoutEffect(() => {
    if (!img) return;
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  /** Tỉ lệ để cạnh ngắn của ảnh vừa khít khung khi zoom = 1 */
  const base = img && box ? box / Math.min(img.naturalWidth, img.naturalHeight) : 1;

  /** Giữ ảnh luôn phủ kín khung (không lộ nền) */
  const clamp = useCallback(
    (p: Pos): Pos => {
      if (!img || !box) return p;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, p.zoom));
      const w = img.naturalWidth * base * zoom;
      const h = img.naturalHeight * base * zoom;
      // x, y: độ lệch tâm ảnh so với tâm khung
      const maxX = (w - box) / 2;
      const maxY = (h - box) / 2;
      return { zoom, x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
    },
    [img, box, base],
  );

  const startGesture = (current: Pos) => {
    const pts = Array.from(pointers.current.values());
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        pos: current,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    } else if (pts.length === 1) {
      gesture.current = { pos: current, dist: 0, midX: pts[0].x, midY: pts[0].y };
    } else gesture.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture(pos);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = Array.from(pointers.current.values());
    if (pts.length >= 2 && g.dist > 0) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, g.pos.zoom * (dist / g.dist)));
      const k = zoom / g.pos.zoom;
      // Phóng quanh điểm giữa 2 ngón, đồng thời kéo theo
      const rect = boxRef.current?.getBoundingClientRect();
      const cx = rect ? g.midX - (rect.left + rect.width / 2) : 0;
      const cy = rect ? g.midY - (rect.top + rect.height / 2) : 0;
      setPos(
        clamp({
          zoom,
          x: cx - (cx - g.pos.x) * k + (midX - g.midX),
          y: cy - (cy - g.pos.y) * k + (midY - g.midY),
        }),
      );
    } else if (pts.length === 1) {
      setPos(clamp({ zoom: g.pos.zoom, x: g.pos.x + (pts[0].x - g.midX), y: g.pos.y + (pts[0].y - g.midY) }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    startGesture(pos);
  };

  const save = async () => {
    if (!img || !box) return;
    setSaving(true);
    setError(null);
    try {
      const scale = base * pos.zoom;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      // Góc trên trái của ảnh (trên màn hình) so với góc trên trái của khung
      const left = (box - w) / 2 + pos.x;
      const top = (box - h) / 2 + pos.y;
      const side = box / scale;
      const sx = Math.max(0, -left / scale);
      const sy = Math.max(0, -top / scale);
      const cropped = await renderCrop(img, sx, sy, Math.min(side, img.naturalWidth - sx, img.naturalHeight - sy));
      await onConfirm(cropped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được ảnh.");
    } finally {
      setSaving(false);
    }
  };

  const scale = base * pos.zoom;
  const w = img ? img.naturalWidth * scale : 0;
  const h = img ? img.naturalHeight * scale : 0;

  return (
    <Dialog open={!!file} onClose={() => !saving && onCancel()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 18, fontWeight: 600, pb: 0.5 }}>Chỉnh ảnh đại diện</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Kéo để đặt khuôn mặt vào khung tròn. Chụm hai ngón hoặc kéo thanh trượt để phóng to.
        </Typography>

        <Box
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            borderRadius: 2,
            bgcolor: "#1d1f20",
            touchAction: "none",
            userSelect: "none",
            cursor: "grab",
            "&:active": { cursor: "grabbing" },
          }}
        >
          {img && url && box > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: w,
                height: h,
                maxWidth: "none",
                transform: `translate3d(${(box - w) / 2 + pos.x}px, ${(box - h) / 2 + pos.y}px, 0)`,
                pointerEvents: "none",
              }}
            />
          ) : (
            !error && (
              <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <CircularProgress sx={{ color: "#fff" }} />
              </Box>
            )
          )}
          {/* Khung tròn: phần ngoài khung tối đi */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
              border: "2px solid rgba(255,255,255,0.85)",
              pointerEvents: "none",
            }}
          />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 2, px: 0.5 }}>
          <ZoomOutRounded fontSize="small" color="action" />
          <Slider
            aria-label="Phóng to"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={pos.zoom}
            disabled={!img}
            onChange={(_e, v) =>
              // Phóng quanh tâm khung: phần đang ở giữa vẫn ở giữa
              setPos((p) => {
                const zoom = v as number;
                const k = zoom / p.zoom;
                return clamp({ zoom, x: p.x * k, y: p.y * k });
              })
            }
          />
          <ZoomInRounded fontSize="small" color="action" />
        </Stack>

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" disabled={saving} onClick={onCancel}>
          Hủy
        </Button>
        <Button
          variant="contained"
          disabled={!img || saving}
          onClick={save}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
