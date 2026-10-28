"use client";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useState } from "react";

type Props = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
};

/** Ô mật khẩu có nút con mắt để hiện/ẩn ký tự đã gõ. */
export function PasswordInput({ id, name, label, required, minLength, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      id={id}
      name={name}
      label={label}
      required={required}
      autoComplete={autoComplete}
      type={visible ? "text" : "password"}
      slotProps={{
        htmlInput: { minLength },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
