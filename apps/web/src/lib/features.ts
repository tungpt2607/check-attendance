// Tính năng đang bật trên máy chủ (vd. gửi email). Chưa bật thì web ẩn phần liên quan.
import { cache } from "react";
import type { Features } from "@check-attendance/shared/api";
import { api } from "./api";

const NONE: Features = { email: false };

/** Mỗi lượt tải trang chỉ hỏi API một lần; API lỗi thì coi như chưa bật */
export const getFeatures = cache(async (): Promise<Features> => {
  try {
    return await api<Features>("/v1/features", { auth: false });
  } catch {
    return NONE;
  }
});
