"use client";

// Liên kết Next.js trong vỏ MUI. Đặt ở file client để trang server dùng được mà không phải truyền hàm qua props.
import Button, { type ButtonProps } from "@mui/material/Button";
import MuiLink, { type LinkProps as MuiLinkProps } from "@mui/material/Link";
import ListItemButton, { type ListItemButtonProps } from "@mui/material/ListItemButton";
import NextLink from "next/link";

export function LinkButton(props: ButtonProps & { href: string }) {
  return <Button component={NextLink} {...props} />;
}

export function AppLink(props: MuiLinkProps & { href: string }) {
  return <MuiLink component={NextLink} underline="hover" {...props} />;
}

/** Một dòng danh sách bấm được để mở trang khác */
export function ListLink(props: ListItemButtonProps & { href: string }) {
  return <ListItemButton component={NextLink} {...props} />;
}
