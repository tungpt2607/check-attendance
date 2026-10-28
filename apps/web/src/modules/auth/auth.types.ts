/** Kết quả gửi form đăng nhập/đăng ký; giữ lại email, họ tên để không phải gõ lại khi có lỗi */
export type AuthFormState = { error?: string; email?: string; name?: string } | undefined;
