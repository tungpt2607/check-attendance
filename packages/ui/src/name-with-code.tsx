// Tên kèm mã số nhỏ phía trước (vd. "01  An Nguyễn"), dùng trong các danh sách thành viên.
import Typography from "@mui/material/Typography";

export function NameWithCode({ name, code }: { name: string; code?: string }) {
  return (
    <>
      {code && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
          {code}
        </Typography>
      )}
      {name}
    </>
  );
}
