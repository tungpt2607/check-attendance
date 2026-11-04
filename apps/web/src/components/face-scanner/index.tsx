"use client";

// Điểm danh bằng khuôn mặt: chủ nhóm cầm điện thoại đi quét từng người.
// - Model nhận diện chạy ngay trên trình duyệt (face-model.ts), ảnh camera không gửi đi đâu.
// - Mỗi khuôn mặt được biến thành 128 con số; chỉ dãy số này gửi lên API để so khớp.
// - Nhận ra thành viên: ghi Có mặt ngay (có nút "Sai người" để hoàn tác).
// - Không nhận ra: hiện danh sách tên để chủ nhóm chọn; khi đó khuôn mặt được lưu lại cho lần sau.
//
// File này chỉ điều phối các bước; từng phần nằm riêng:
//   face-model.ts (tải model) · use-camera.ts (camera) · use-face-detection.ts (vòng dò + kiểm tra chất lượng)
//   camera-view.tsx (khung camera) · result-card.tsx (kết quả) · member-picker.tsx (chọn tên)
import CameraswitchRounded from "@mui/icons-material/CameraswitchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { LinkButton } from "@check-attendance/ui/links";
import { assignFaceAction, scanFaceAction, undoFaceAction } from "@/modules/attendance/face.actions";
import { CameraBusy, CameraError, CameraPill, CameraView, cameraButtonSx } from "./camera-view";
import { captureFace, faceDistance, loadFaceApi, type FaceApiModule } from "./face-model";
import { MemberPicker } from "./member-picker";
import { ResultCard } from "./result-card";
import type { CheckedInResult, FaceMember, ScanResult, Snapshot } from "./types";
import { useCamera, type Facing } from "./use-camera";
import { useFaceDetection } from "./use-face-detection";

export type { FaceMember } from "./types";

/** Người vừa quét xong: bỏ qua nếu vẫn còn trong khung hình trong khoảng thời gian này */
const COOLDOWN_MS = 6000;
const SAME_PERSON_DISTANCE = 0.45;
/** Thời gian hiện kết quả trước khi quét tiếp */
const RESULT_MS = 4000;
const NETWORK_ERROR = { ok: false as const, error: "Không kết nối được máy chủ." };

/** Bước hiện tại (sau khi đã tải xong model và mở được camera) */
type Step =
  | { name: "scanning" }
  | { name: "sending" }
  | { name: "result"; result: ScanResult }
  | { name: "picking"; descriptor: number[]; snapshot: Snapshot; reason: "unknown" | "wrong" };

type Props = {
  groupId: string;
  sessionId: string;
  members: FaceMember[];
  backHref: string;
};

export function FaceScanner({ groupId, sessionId, members, backHref }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // 1. Model nhận diện (tải một lần), 2. camera
  const [faceapi, setFaceapi] = useState<FaceApiModule | null>(null);
  const [modelFailed, setModelFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadFaceApi()
      .then((f) => !cancelled && setFaceapi(f))
      .catch((err) => {
        console.error(err);
        if (!cancelled) setModelFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [facing, setFacing] = useState<Facing>("environment");
  const camera = useCamera(videoRef, facing, !!faceapi);
  const fatal = modelFailed ? "Không tải được bộ nhận diện khuôn mặt. Kiểm tra mạng rồi tải lại trang." : camera.error;
  const loading = !fatal && (!faceapi || !camera.ready);

  // 3. Các bước quét
  const [step, setStep] = useState<Step>({ name: "scanning" });
  /** Đổi mỗi lượt chọn tên: hộp chọn tên mở ra luôn ở trạng thái ban đầu */
  const [pickRound, setPickRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attended, setAttended] = useState<Set<string>>(() => new Set(members.filter((m) => m.attended).map((m) => m.id)));
  /** Những khuôn mặt vừa xử lý xong, để không quét lặp lại người đang đứng trước camera */
  const recentRef = useRef<{ descriptor: ArrayLike<number>; until: number }[]>([]);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markAttended = useCallback((id: string, yes: boolean) => {
    setAttended((s) => {
      const next = new Set(s);
      if (yes) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clearResultTimer = () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = null;
  };
  useEffect(() => clearResultTimer, []);

  const resume = useCallback(() => {
    clearResultTimer();
    setStep({ name: "scanning" });
  }, []);

  const showResult = useCallback(
    (result: ScanResult) => {
      setStep({ name: "result", result });
      clearResultTimer();
      resultTimer.current = setTimeout(resume, RESULT_MS);
    },
    [resume],
  );

  const pick = (descriptor: number[], snapshot: Snapshot, reason: "unknown" | "wrong") => {
    setPickRound((n) => n + 1);
    setStep({ name: "picking", descriptor, snapshot, reason });
  };

  /** Lỗi khi gọi máy chủ: báo rồi quét tiếp */
  const failed = (message: string) => {
    setError(message);
    resume();
  };

  const isRecent = (descriptor: Float32Array) => {
    const now = Date.now();
    return recentRef.current.some((r) => r.until > now && faceDistance(r.descriptor, descriptor) < SAME_PERSON_DISTANCE);
  };

  const send = async (descriptor: Float32Array, snapshot: Snapshot) => {
    setStep({ name: "sending" });
    setError(null);
    const now = Date.now();
    recentRef.current = [...recentRef.current.filter((r) => r.until > now), { descriptor, until: now + COOLDOWN_MS }];
    const list = Array.from(descriptor);
    const res = await scanFaceAction(groupId, sessionId, list).catch(() => NETWORK_ERROR);
    if (!res.ok) return failed(res.error);
    if (res.result === "checked_in") {
      markAttended(res.memberId, true);
      showResult({ kind: "checked_in", memberId: res.memberId, name: res.name, previousStatus: res.previousStatus, snapshot, descriptor: list });
    } else if (res.result === "already") {
      showResult({ kind: "already", name: res.name, snapshot });
    } else {
      pick(list, snapshot, "unknown");
    }
  };

  const hint = useFaceDetection({
    faceapi,
    videoRef,
    overlayRef,
    active: !loading && !fatal && step.name === "scanning",
    isRecent,
    onFace: (descriptor, box) => void send(descriptor, videoRef.current ? captureFace(videoRef.current, box) : null),
  });

  // ---------- Thao tác của chủ nhóm ----------

  const wrongPerson = async (r: CheckedInResult) => {
    clearResultTimer();
    setStep({ name: "sending" });
    const res = await undoFaceAction(groupId, sessionId, r.memberId, r.previousStatus).catch(() => NETWORK_ERROR);
    if (!res.ok) return failed(res.error);
    markAttended(r.memberId, false);
    pick(r.descriptor, r.snapshot, "wrong");
  };

  const assign = async (member: FaceMember, descriptor: number[], snapshot: Snapshot) => {
    setStep({ name: "sending" });
    setError(null);
    const res = await assignFaceAction(groupId, sessionId, member.id, descriptor).catch(() => NETWORK_ERROR);
    if (!res.ok) return failed(res.error);
    markAttended(res.memberId, true);
    showResult({ kind: "assigned", name: res.name, faceSaved: res.faceSaved, already: res.already, snapshot });
  };

  const picking = step.name === "picking" ? step : null;
  // Giữ lượt chọn cuối để nội dung hộp chọn tên không đổi trong lúc hộp đang đóng dần
  const lastPick = useRef(picking);
  if (picking) lastPick.current = picking;

  return (
    <Box sx={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <CameraView videoRef={videoRef} overlayRef={overlayRef} mirrored={facing === "user"}>
        <CameraPill placement="top-left">
          Có mặt {attended.size}/{members.length}
        </CameraPill>
        <Button
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          disabled={loading || !!fatal}
          aria-label="Đổi camera trước/sau"
          sx={cameraButtonSx}
        >
          <CameraswitchRounded />
        </Button>

        {fatal ? (
          <CameraError text={fatal} />
        ) : loading ? (
          <CameraBusy text={faceapi ? "Đang mở camera..." : "Đang tải bộ nhận diện khuôn mặt..."} />
        ) : step.name === "sending" ? (
          <CameraBusy text="Đang nhận diện..." />
        ) : step.name === "scanning" ? (
          <CameraPill placement="bottom">{hint}</CameraPill>
        ) : step.name === "result" ? (
          <ResultCard result={step.result} onWrong={wrongPerson} onNext={resume} />
        ) : null}
      </CameraView>

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
        key={pickRound}
        open={!!picking}
        reason={lastPick.current?.reason ?? "unknown"}
        snapshot={lastPick.current?.snapshot ?? null}
        members={members}
        attended={attended}
        onPick={(m) => picking && assign(m, picking.descriptor, picking.snapshot)}
        onSkip={resume}
      />
    </Box>
  );
}
