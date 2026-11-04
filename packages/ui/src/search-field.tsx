"use client";

// Ô tìm kiếm dùng chung: icon kính lúp, kiểu "search" (có nút xóa trên điện thoại).
import SearchRounded from "@mui/icons-material/SearchRounded";
import InputAdornment from "@mui/material/InputAdornment";
import TextField, { type TextFieldProps } from "@mui/material/TextField";

type Props = Omit<TextFieldProps, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /**
   * Ô tìm kiếm nằm trong một form khác (vd. bảng điểm danh): không gửi giá trị cùng form
   * và Enter không vô tình bấm nút gửi.
   */
  insideForm?: boolean;
};

export function SearchField({ value, onChange, insideForm = false, placeholder = "Tìm theo tên hoặc mã...", slotProps, ...rest }: Props) {
  return (
    <TextField
      {...rest}
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={
        insideForm
          ? (e) => {
              if (e.key === "Enter") e.preventDefault();
            }
          : rest.onKeyDown
      }
      slotProps={{
        ...slotProps,
        htmlInput: insideForm ? { form: "__none__" } : undefined,
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
