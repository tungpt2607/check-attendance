/** Kết quả gửi form đăng nhập/đăng ký; giữ lại email, họ tên để không phải gõ lại khi có lỗi */
export type AuthFormState = { error?: string; email?: string; name?: string } | undefined;

/** Kết quả form quên mật khẩu: sent = đã gửi yêu cầu */
export type ForgotFormState = { error?: string; email?: string; sent?: boolean } | undefined;

/** Kết quả form đặt lại mật khẩu */
export type ResetFormState = { error?: string } | undefined;
