"use client";

// Điểm danh bằng khuôn mặt: chủ nhóm cầm điện thoại đi quét từng người.
// - Model nhận diện chạy ngay trên trình duyệt (apps/web/public/models/face), ảnh camera không gửi đi đâu.
// - Mỗi khuôn mặt được biến thành 128 con số; chỉ dãy số này gửi lên API để so khớp.
// - Nhận ra thành viên: ghi Có mặt ngay (có nút "Sai người" để hoàn tác).
// - Không nhận ra: hiện danh sách tên để chủ nhóm chọn; khi đó khuôn mặt được lưu lại cho lần sau.
import CameraswitchRounded from "@mui/icons-material/CameraswitchRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import FaceRetouchingNaturalRounded from "@mui/icons-material/FaceRetouchingNaturalRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as FaceApi from "@vladmandic/face-api";
import { normalizeSearch } from "@check-attendance/shared/search";
import type { AttendanceStatus } from "@check-attendance/shared/statuses";
import { brand } from "@check-attendance/ui/brand";
import { LinkButton } from "@check-attendance/ui/links";
import { assignFaceAction, scanFaceAction, undoFaceAction } from "@/modules/attendance/face.actions";

export type FaceMember = { id: string; name: string; code: string; attended: boolean };

type Props = {
  groupId: string;
  sessionId: string;
  members: FaceMember[];
  backHref: string;
};

/** Thư mục model trong public/ (tiny_face_detector, face_landmark_68, face_recognition) */
const MODEL_URL = "/models/face";
/** Khoảng nghỉ giữa hai lần dò khuôn mặt */
const SCAN_INTERVAL_MS = 250;
/** Độ tin cậy tối thiểu của khung khuôn mặt */
const MIN_SCORE = 0.6;
/** Khuôn mặt phải chiếm ít nhất ngần này bề ngang khung hình (đủ gần để nhận diện chính xác) */
const MIN_FACE_RATIO = 0.18;
/** Hai khung hình liên tiếp phải giống nhau ngần này mới gửi đi (tránh ảnh nhòe khi đang di chuyển) */
const STABLE_DISTANCE = 0.4;
/** Người vừa quét xong: bỏ qua nếu vẫn còn trong khung hình trong khoảng thời gian này */
const COOLDOWN_MS = 6000;
const SAME_PERSON_DISTANCE = 0.45;
/** Thời gian hiện kết quả trước khi quét tiếp */
const RESULT_MS = 4000;

type Snapshot = string | null;
type Result =
  | {
      kind: "checked_in";
      memberId: string;
      name: string;
      previousStatus: AttendanceStatus | null;
      snapshot: Snapshot;
      /** Khuôn mặt vừa quét: nếu nhận nhầm thì dùng lại để gán cho đúng người */
      descriptor: number[];
    }
  | { kind: "already"; name: string; snapshot: Snapshot }
  | { kind: "assigned"; name: string; faceSaved: "account" | "member" | null; already: boolean; snapshot: Snapshot };

type Phase =
  | { name: "loading"; text: string }
  | { name: "fatal"; text: string }
  | { name: "scanning" }
  | { name: "sending" }
  | { name: "result"; result: Result }
  | { name: "picking"; descriptor: number[]; snapshot: Snapshot; reason: "unknown" | "wrong" };

function distance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Chọn nơi chạy model: WebGL (GPU của điện thoại, nhanh) nếu có, không thì CPU (chậm hơn nhưng chạy được).
 * Không để thư viện tự chọn: nó ưu tiên WebAssembly, cần thêm file .wasm mà web không phục vụ.
 */
async function chooseBackend(faceapi: typeof FaceApi) {
  // Kiểu dữ liệu của thư viện không khai báo hai hàm này dù bản chạy có (TensorFlow.js)
  const tf = faceapi.tf as unknown as { setBackend(name: string): Promise<boolean>; ready(): Promise<void> };
  for (const name of ["webgl", "cpu"]) {
    try {
      if (await tf.setBackend(name)) {
        await tf.ready();
        return;
      }
    } catch {
      // thử cách tiếp theo
    }
  }
  throw new Error("Không có backend nào chạy được");
}

function cameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Chưa được phép dùng camera. Hãy cho phép trình duyệt truy cập camera rồi tải lại trang.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Không tìm thấy camera trên thiết bị này.";
  if (name === "NotReadableError") return "Camera đang được ứng dụng khác sử dụng.";
  return "Không mở được camera. Hãy thử lại.";
}

export function FaceScanner({ groupId, sessionId, members, backHref }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const faceapiRef = useRef<typeof FaceApi | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhaseState] = useState<Phase>({ name: "loading", text: "Đang tải bộ nhận diện khuôn mặt..." });
  const phaseRef = useRef<Phase>(phase);
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [hint, setHint] = useState<string>("Hướng camera vào khuôn mặt từng người");
  const [error, setError] = useState<string | null>(null);
  const [attended, setAttended] = useState<Set<string>>(() => new Set(members.filter((m) => m.attended).map((m) => m.id)));
  /** Khung hình trước (để kiểm tra khuôn mặt đã đứng yên) */
  const prevRef = useRef<Float32Array | null>(null);
  /** Những khuôn mặt vừa xử lý xong, để không quét lặp lại người đang đứng trước camera */
  const recentRef = useRef<{ descriptor: Float32Array | number[]; until: number }[]>([]);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = members.length;
  const markAttended = useCallback((id: string, yes: boolean) => {
    setAttended((s) => {
      const next = new Set(s);
      if (yes) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const remember = useCallback((descriptor: Float32Array | number[]) => {
    const now = Date.now();
    recentRef.current = [...recentRef.current.filter((r) => r.until > now), { descriptor, until: now + COOLDOWN_MS }];
  }, []);

  const resume = useCallback(() => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = null;
    prevRef.current = null;
    setPhase({ name: "scanning" });
  }, [setPhase]);

  const showResult = useCallback(
    (result: Result) => {
      setPhase({ name: "result", result });
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(resume, RESULT_MS);
    },
    [resume, setPhase],
  );

  // 1. Tải model (một lần)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        await chooseBackend(faceapi);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;
        faceapiRef.current = faceapi;
        setModelLoaded(true);
        setPhase({ name: "loading", text: "Đang mở camera..." });
      } catch (err) {
        console.error(err);
        if (!cancelled) setPhase({ name: "fatal", text: "Không tải được bộ nhận diện khuôn mặt. Kiểm tra mạng rồi tải lại trang." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPhase]);

  // 2. Mở camera (mở lại khi đổi camera trước/sau)
  useEffect(() => {
    if (!modelLoaded || phaseRef.current.name === "fatal") return;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase({ name: "fatal", text: "Trình duyệt này không hỗ trợ camera. Hãy mở bằng Chrome hoặc Safari mới." });
        return;
      }
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (phaseRef.current.name === "loading") setPhase({ name: "scanning" });
      } catch (err) {
        if (!cancelled) setPhase({ name: "fatal", text: cameraError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facing, modelLoaded, setPhase]);

  // Tắt camera khi rời trang
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    },
    [],
  );

  /** Ảnh nhỏ khuôn mặt vừa quét, chỉ để chủ nhóm đối chiếu trên màn hình (không gửi đi) */
  const snapshot = useCallback((box: FaceApi.Box): Snapshot => {
    const video = videoRef.current;
    if (!video) return null;
    const pad = box.width * 0.3;
    const sx = Math.max(0, box.x - pad);
    const sy = Math.max(0, box.y - pad);
    const sw = Math.min(video.videoWidth - sx, box.width + pad * 2);
    const sh = Math.min(video.videoHeight - sy, box.height + pad * 2);
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = Math.round((160 * sh) / sw) || 160;
    canvas.getContext("2d")?.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const send = useCallback(
    async (descriptor: Float32Array, shot: Snapshot) => {
      setPhase({ name: "sending" });
      setError(null);
      remember(descriptor);
      const list = Array.from(descriptor);
      const res = await scanFaceAction(groupId, sessionId, list).catch(() => ({ ok: false as const, error: "Không kết nối được máy chủ." }));
      if (!res.ok) {
        setError(res.error);
        resume();
        return;
      }
      if (res.result === "checked_in") {
        markAttended(res.memberId, true);
        showResult({
          kind: "checked_in",
          memberId: res.memberId,
          name: res.name,
          previousStatus: res.previousStatus,
          snapshot: shot,
          descriptor: list,
        });
      } else if (res.result === "already") {
        showResult({ kind: "already", name: res.name, snapshot: shot });
      } else {
        setPhase({ name: "picking", descriptor: list, snapshot: shot, reason: "unknown" });
      }
    },
    [groupId, markAttended, remember, resume, sessionId, setPhase, showResult],
  );

  // 3. Vòng quét: dò khuôn mặt → kiểm tra chất lượng → gửi đi
  useEffect(() => {
    if (phase.name !== "scanning") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const draw = (box: FaceApi.Box | null, ok: boolean) => {
      const canvas = overlayRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!box) return;
      ctx.lineWidth = Math.max(3, canvas.width / 160);
      ctx.strokeStyle = ok ? brand.teal : brand.orange;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    };

    const tick = async () => {
      const faceapi = faceapiRef.current;
      const video = videoRef.current;
      if (stopped || !faceapi || !video) return;
      if (video.readyState < 2 || !video.videoWidth) {
        timer = setTimeout(tick, SCAN_INTERVAL_MS);
        return;
      }
      try {
        const found = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (stopped) return;
        if (!found) {
          draw(null, false);
          prevRef.current = null;
          setHint("Hướng camera vào khuôn mặt từng người");
        } else {
          const box = found.detection.box;
          const bigEnough = box.width >= video.videoWidth * MIN_FACE_RATIO;
          const clear = found.detection.score >= MIN_SCORE;
          const now = Date.now();
          const seen = recentRef.current.some((r) => r.until > now && distance(r.descriptor, found.descriptor) < SAME_PERSON_DISTANCE);
          draw(box, bigEnough && clear && !seen);
          if (seen) {
            setHint("Đã quét người này. Chuyển sang người tiếp theo");
            prevRef.current = null;
          } else if (!bigEnough) {
            setHint("Đưa camera lại gần hơn");
            prevRef.current = null;
          } else if (!clear) {
            setHint("Giữ yên, nhìn thẳng vào camera");
            prevRef.current = null;
          } else if (prevRef.current && distance(prevRef.current, found.descriptor) < STABLE_DISTANCE) {
            draw(null, false);
            prevRef.current = null;
            void send(found.descriptor, snapshot(box));
            return;
          } else {
            prevRef.current = found.descriptor;
            setHint("Giữ yên...");
          }
        }
      } catch (err) {
        console.error(err);
      }
      timer = setTimeout(tick, SCAN_INTERVAL_MS);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [phase.name, send, snapshot]);

  // ---------- Thao tác của chủ nhóm ----------

  const wrongPerson = async (r: Extract<Result, { kind: "checked_in" }>) => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    setPhase({ name: "sending" });
    const res = await undoFaceAction(groupId, sessionId, r.memberId, r.previousStatus).catch(() => ({
      ok: false as const,
      error: "Không kết nối được máy chủ.",
    }));
    if (!res.ok) {
      setError(res.error);
      resume();
      return;
    }
    markAttended(r.memberId, false);
    setPhase({ name: "picking", descriptor: r.descriptor, snapshot: r.snapshot, reason: "wrong" });
  };

  const assign = async (member: FaceMember, descriptor: number[], shot: Snapshot) => {
    setPhase({ name: "sending" });
    setError(null);
    const res = await assignFaceAction(groupId, sessionId, member.id, descriptor).catch(() => ({
      ok: false as const,
      error: "Không kết nối được máy chủ.",
    }));
    if (!res.ok) {
      setError(res.error);
      resume();
      return;
    }
    markAttended(res.memberId, true);
    showResult({ kind: "assigned", name: res.name, faceSaved: res.faceSaved, already: res.already, snapshot: shot });
  };

  const mirrored = facing === "user";
  const busy = phase.name === "sending";

  return (
    <Box sx={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
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
        <Box
          component="video"
          ref={videoRef}
          playsInline
          muted
          autoPlay
          sx={{ width: "100%", height: "100%", objectFit: "contain", transform: mirrored ? "scaleX(-1)" : undefined }}
        />
        <Box
          component="canvas"
          ref={overlayRef}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            transform: mirrored ? "scaleX(-1)" : undefined,
          }}
        />

        {/* Đếm số người đã có mặt */}
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            px: 1.5,
            py: 0.5,
            borderRadius: 99,
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Có mặt {attended.size}/{total}
        </Box>
        <Button
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          disabled={phase.name === "loading" || phase.name === "fatal"}
          aria-label="Đổi camera trước/sau"
          sx={{ position: "absolute", top: 8, right: 8, minWidth: 0, p: 1, borderRadius: 99, bgcolor: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          <CameraswitchRounded />
        </Button>

        {(phase.name === "loading" || busy) && (
          <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: "rgba(0,0,0,0.35)" }}>
            <Box sx={{ textAlign: "center", color: "#fff" }}>
              <CircularProgress color="inherit" />
              <Typography sx={{ mt: 1 }}>{phase.name === "loading" ? phase.text : "Đang nhận diện..."}</Typography>
            </Box>
          </Box>
        )}

        {phase.name === "fatal" && (
          <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", p: 3 }}>
            <Alert severity="error">{phase.text}</Alert>
          </Box>
        )}

        {phase.name === "scanning" && (
          <Box
            sx={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              px: 2,
              py: 0.75,
              borderRadius: 99,
              bgcolor: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            {hint}
          </Box>
        )}

        {phase.name === "result" && <ResultCard result={phase.result} onWrong={wrongPerson} onNext={resume} />}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        Ảnh camera chỉ xử lý trên điện thoại này. Hệ thống chỉ lưu dữ liệu đặc trưng khuôn mặt (không lưu ảnh); thành viên có thể
        tự xóa trong trang Tài khoản.
      </Typography>

      <LinkButton href={backHref} variant="contained">
        Xong
      </LinkButton>

      <MemberPicker
        open={phase.name === "picking"}
        reason={phase.name === "picking" ? phase.reason : "unknown"}
        snapshot={phase.name === "picking" ? phase.snapshot : null}
        members={members}
        attended={attended}
        onPick={(m) => phase.name === "picking" && assign(m, phase.descriptor, phase.snapshot)}
        onSkip={resume}
      />
    </Box>
  );
}

function FaceThumb({ src }: { src: Snapshot }) {
  if (!src) return <FaceRetouchingNaturalRounded sx={{ fontSize: 56, color: brand.tealDark }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <Box component="img" src={src} alt="" sx={{ width: { xs: 56, sm: 72 }, height: { xs: 56, sm: 72 }, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />;
}

function ResultCard({
  result,
  onWrong,
  onNext,
}: {
  result: Result;
  onWrong: (r: Extract<Result, { kind: "checked_in" }>) => void;
  onNext: () => void;
}) {
  const ok = result.kind !== "already";
  let detail: string;
  if (result.kind === "checked_in") detail = "Đã ghi Có mặt";
  else if (result.kind === "already") detail = "Đã điểm danh trước đó";
  else {
    const saved =
      result.faceSaved === "account"
        ? "Đã lưu khuôn mặt vào tài khoản."
        : result.faceSaved === "member"
          ? "Đã lưu khuôn mặt cho lần sau."
          : "Tài khoản đã có khuôn mặt, giữ nguyên.";
    detail = `${result.already ? "Đã điểm danh trước đó" : "Đã ghi Có mặt"}. ${saved}`;
  }
  return (
    <Box sx={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          borderRadius: 3,
          bgcolor: ok ? brand.tealLighter : "#fff",
          border: `1px solid ${ok ? brand.tealLight : brand.border}`,
          boxShadow: 3,
        }}
      >
        <FaceThumb src={result.snapshot} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 0.5 }} noWrap>
            {ok && <CheckCircleRounded sx={{ color: brand.tealDark, fontSize: 22 }} />}
            {result.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {detail}
          </Typography>
        </Box>
        {result.kind === "checked_in" ? (
          <Button color="error" variant="outlined" size="small" onClick={() => onWrong(result)} sx={{ flexShrink: 0 }}>
            Sai người
          </Button>
        ) : (
          <Button size="small" onClick={onNext} sx={{ flexShrink: 0 }}>
            Tiếp
          </Button>
        )}
      </Box>
    </Box>
  );
}

function MemberPicker({
  open,
  reason,
  snapshot,
  members,
  attended,
  onPick,
  onSkip,
}: {
  open: boolean;
  reason: "unknown" | "wrong";
  snapshot: Snapshot;
  members: FaceMember[];
  attended: Set<string>;
  onPick: (m: FaceMember) => void;
  onSkip: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Mỗi lần mở hộp chọn: xóa ô tìm kiếm
  useEffect(() => {
    if (open) {
      setQuery("");
      setShowAll(false);
    }
  }, [open]);

  const list = useMemo(() => {
    const q = normalizeSearch(query);
    return members.filter(
      (m) => (showAll || !attended.has(m.id)) && (!q || normalizeSearch(`${m.name} ${m.code}`).includes(q)),
    );
  }, [attended, members, query, showAll]);

  return (
    <Dialog open={open} onClose={onSkip} fullWidth maxWidth="xs" scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <FaceThumb src={snapshot} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
            {reason === "wrong" ? "Người này là ai?" : "Chưa nhận ra khuôn mặt"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Chọn tên để ghi Có mặt và lưu khuôn mặt cho lần sau.
          </Typography>
        </Box>
      </DialogTitle>
      <Box sx={{ px: 3, pb: 1 }}>
        <TextField
          type="search"
          size="small"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel
          control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
          label={<Typography variant="body2">Hiện cả người đã điểm danh</Typography>}
          sx={{ mt: 0.5 }}
        />
      </Box>
      <DialogContent dividers sx={{ p: 0 }}>
        <List disablePadding>
          {list.length === 0 && (
            <Typography sx={{ py: 3, textAlign: "center" }} variant="body2" color="text.secondary">
              {query ? "Không tìm thấy tên phù hợp." : "Mọi người đều đã điểm danh."}
            </Typography>
          )}
          {list.map((m, i) => (
            <ListItemButton key={m.id} divider={i < list.length - 1} onClick={() => onPick(m)}>
              <ListItemText
                primary={m.name}
                secondary={[m.code, attended.has(m.id) ? "Đã điểm danh" : ""].filter(Boolean).join(" · ") || undefined}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onSkip} color="inherit">
          Bỏ qua
        </Button>
      </DialogActions>
    </Dialog>
  );
}
