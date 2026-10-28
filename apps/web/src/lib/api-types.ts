// Kiểu dữ liệu backend API trả về (xem /docs của API). Ngày giờ là chuỗi ISO 8601.
import type { AttendanceStatus } from "@/modules/attendance/attendance.statuses";

export type StatusCounts = Partial<Record<AttendanceStatus, number>>;

/** Tài khoản đã liên kết (người khác thấy: không có dữ liệu nhạy cảm ngoài email cho chủ nhóm) */
export type PublicAccount = { id: string; name: string; email: string; avatarVersion: number | null };

export type ShareLink = { url: string; qrDataUrl: string; expiresAt: string | null };

export type Rate = { counts: StatusCounts; recorded: number; rate: number | null };

export type MemberRow = {
  id: string;
  name: string;
  code: string;
  linkedAccount: PublicAccount | null;
  stats: Rate;
};

export type SessionSummary = {
  id: string;
  groupId: string;
  title: string;
  date: string;
  method: string;
  selfCheckInOpen: boolean;
  counts: StatusCounts;
};

export type LinkRequestRow = {
  id: string;
  account: PublicAccount | null;
  memberId: string;
  memberName: string | null;
  createdAt: string;
};

export type MemberDetail = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  code: string;
  linkedAccount: PublicAccount | null;
  stats: Rate;
  history: {
    sessionId: string;
    title: string;
    date: string;
    status: AttendanceStatus | null;
    note: string;
    source: "manual" | "self" | null;
    checkedInAt: string | null;
  }[];
};

export type SessionDetail = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  date: string;
  method: string;
  selfCheckInOpen: boolean;
  defaultStatus: AttendanceStatus;
  rows: {
    memberId: string;
    name: string;
    code: string;
    linked: boolean;
    status: AttendanceStatus | null;
    note: string;
    source: "manual" | "self" | null;
    checkedInAt: string | null;
  }[];
};

export type CheckInInfo = {
  sessionId: string;
  title: string;
  date: string;
  groupName: string;
  members: { id: string; name: string; code: string; linked: boolean; isMe: boolean; checkedIn: boolean }[];
};

export type Membership = { memberId: string; memberName: string; groupId: string; groupName: string };

export type MyMembership = {
  memberName: string;
  groupName: string;
  items: { sessionId: string; title: string; date: string; status: AttendanceStatus | null; note: string }[];
  counts: StatusCounts;
  recorded: number;
  rate: number | null;
  roster: {
    id: string;
    name: string;
    code: string;
    linked: { userId: string; name: string; avatarVersion: number | null } | null;
  }[];
};

export type InviteInfo = {
  memberId: string;
  memberName: string;
  memberCode: string;
  groupName: string;
  expiresAt: string | null;
  memberAlreadyLinked: boolean;
  myMemberId: string | null;
  myMemberName: string | null;
};

export type JoinInfo = {
  groupName: string;
  myMemberId: string | null;
  myMemberName: string | null;
  pendingRequest: { memberId: string; memberName: string | null } | null;
  members: { id: string; name: string; code: string }[];
};
