"use client";

import { createTheme } from "@mui/material/styles";
import { brand } from "./brand";

const fontFamily = [
  "system-ui",
  "-apple-system",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(",");

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: brand.tealDark, light: brand.teal, dark: brand.tealDarker, contrastText: "#fff" },
    secondary: { main: brand.orange, dark: brand.orangeDark, light: brand.orangeLight, contrastText: brand.onBrand },
    success: { main: brand.tealDark, light: brand.tealLight, dark: brand.tealDarker, contrastText: "#fff" },
    warning: { main: brand.orange, dark: brand.orangeDark, light: brand.orangeLight, contrastText: brand.onBrand },
    error: { main: brand.red, dark: brand.redDark, light: brand.redLight, contrastText: "#fff" },
    text: { primary: brand.ink, secondary: brand.inkMuted },
    background: { default: brand.background, paper: "#fff" },
    divider: brand.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h1: { fontSize: "1.6rem", fontWeight: 700 },
    h2: { fontSize: "1.05rem", fontWeight: 600 },
    // Tiếng Việt không viết HOA toàn bộ chữ trên nút
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, paddingInline: 16 } },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { borderRadius: 14, borderColor: brand.border } },
    },
    MuiTextField: { defaultProps: { fullWidth: true, size: "small" } },
    MuiInputBase: {
      // 16px để iPhone không tự phóng to khi chạm vào ô nhập
      styleOverrides: { input: { fontSize: 16 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: brand.teal, borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { "&.Mui-focused": { color: brand.tealDark } } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: { root: { backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 500, paddingBlock: 6 } },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiLinearProgress: {
      styleOverrides: { bar: { backgroundColor: brand.teal }, root: { backgroundColor: "#E6EEEE" } },
    },
  },
});
