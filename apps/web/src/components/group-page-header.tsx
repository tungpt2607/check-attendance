"use client";

// Tiêu đề trang nhóm: tên, mô tả, nhãn link tham gia, menu ⋮ (đổi tên, link tham gia, xóa nhóm)
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LinkRounded from "@mui/icons-material/LinkRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useState } from "react";
import { deleteGroupAction } from "@/modules/groups/group.actions";
import type { ShareLink } from "@check-attendance/shared/api";
import { ActionMenu } from "./action-menu";
import { ConfirmDialog } from "./confirm-dialog";
import { RenameGroupDialog } from "./edit-dialogs";
import { GroupInviteDialog } from "./group-invite-dialog";
import { PageHeader } from "./page-header";
import { RateBadge } from "./rate";
import { brand } from "@/theme/brand";

/**
 * Tiêu đề trang nhóm: tên, mô tả, nhãn "Link tham gia đang bật" (bấm để mở link)
 * và menu "⋮": Đổi tên nhóm, Link tham gia nhóm (ghi trạng thái bật/tắt), Xóa nhóm
 */
export function GroupPageHeader({
  groupId,
  groupName,
  subtitle,
  canDelete,
  inviteLink,
  branchRate,
}: {
  groupId: string;
  groupName: string;
  subtitle: string;
  /** Chỉ xóa được khi không còn nhóm con */
  canDelete: boolean;
  inviteLink: ShareLink | null;
  /** Chuyên cần chung của nhóm này và mọi nhóm con (undefined: không hiện, khi nhóm không có nhóm con) */
  branchRate?: number | null;
}) {
  const [open, setOpen] = useState<"rename" | "invite" | "delete" | null>(null);
  const [link, setLink] = useState<ShareLink | null>(inviteLink);
  const close = () => setOpen(null);
  return (
    <>
      <PageHeader
        title={groupName}
        subtitle={
          <>
            {subtitle}
            {branchRate !== undefined && (
              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
                Chuyên cần cả nhánh (gồm nhóm con): <RateBadge rate={branchRate} inline />
              </Box>
            )}
            {link && (
              <Box component="span" sx={{ display: "block", mt: 1 }}>
                <Chip
                  component="span"
                  size="small"
                  icon={<LinkRounded />}
                  label="Link tham gia đang bật"
                  onClick={() => setOpen("invite")}
                  sx={{ bgcolor: brand.tealLighter, color: brand.tealDarker, fontWeight: 500, "& .MuiChip-icon": { color: brand.tealDark } }}
                />
              </Box>
            )}
          </>
        }
        actions={
          <ActionMenu
            label="Thao tác với nhóm"
            actions={[
              { label: "Đổi tên nhóm", icon: <EditOutlined fontSize="small" />, onClick: () => setOpen("rename") },
              {
                label: `Link tham gia nhóm · ${link ? "Đang bật" : "Đang tắt"}`,
                icon: <LinkRounded fontSize="small" />,
                onClick: () => setOpen("invite"),
              },
              { label: "Xóa nhóm", icon: <DeleteOutline fontSize="small" />, onClick: () => setOpen("delete"), danger: true, hidden: !canDelete },
            ]}
          />
        }
      />
      <RenameGroupDialog key={groupName} groupId={groupId} name={groupName} open={open === "rename"} onClose={close} />
      <GroupInviteDialog groupId={groupId} groupName={groupName} link={link} onLinkChange={setLink} open={open === "invite"} onClose={close} />
      {canDelete && (
        <ConfirmDialog
          open={open === "delete"}
          onClose={close}
          danger
          action={deleteGroupAction}
          redirects
          fields={{ groupId }}
          confirmLabel="Xóa nhóm"
          pendingText="Đang xóa..."
          successMessage="Đã xóa nhóm"
          message={`Xóa nhóm "${groupName}" cùng toàn bộ thành viên và dữ liệu điểm danh? Không thể khôi phục.`}
        />
      )}
    </>
  );
}
