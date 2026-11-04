import type { AttendanceStatus } from "@check-attendance/shared/statuses";

export type FaceMember = { id: string; name: string; code: string; attended: boolean };

/** Ảnh nhỏ khuôn mặt vừa quét (data URL), chỉ hiện trên màn hình */
export type Snapshot = string | null;

export type ScanResult =
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

export type CheckedInResult = Extract<ScanResult, { kind: "checked_in" }>;
