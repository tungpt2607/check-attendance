"use client";

// Tiêu đề trang nhóm: tên, mô tả, nhãn link tham gia, menu ⋮ (người quản lý, đổi tên, link tham gia, xóa nhóm — theo quyền)
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LinkRounded from "@mui/icons-material/LinkRounded";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteGroupAction } from "@/modules/groups/group.actions";
import type { ShareLink } from "@check-attendance/shared/api";
import { ActionMenu } from "@check-attendance/ui/action-menu";
import { ConfirmDialog } from "@check-attendance/ui/confirm-dialog";
import { RenameGroupDialog } from "./edit-dialogs";
import { GroupInviteDialog } from "./group-invite-dialog";
import { PageHeader } from "@check-attendance/ui/page-header";
import { RateBadge } from "./rate";
import { brand } from "@check-attendance/ui/brand";
import { can, type GroupAccess } from "@check-attendance/shared/permissions";

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
  access,
}: {
  groupId: string;
  groupName: string;
  subtitle: string;
  /** Chỉ xóa được khi không còn nhóm con */
  canDelete: boolean;
  inviteLink: ShareLink | null;
  /** Chuyên cần chung của nhóm này và mọi nhóm con (undefined: không hiện, khi nhóm không có nhóm con) */
  branchRate?: number | null;
  /** Quyền của người xem: chỉ hiện thao tác được phép */
  access: GroupAccess;
}) {
  const router = useRouter();
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
                  onClick={can(access, "links") ? () => setOpen("invite") : undefined}
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
              {
                label: access.role === "owner" ? "Người quản lý" : "Người quản lý nhóm",
                icon: <ManageAccountsOutlined fontSize="small" />,
                onClick: () => router.push(`/groups/${groupId}/managers`),
              },
              { label: "Đổi tên nhóm", icon: <EditOutlined fontSize="small" />, onClick: () => setOpen("rename"), hidden: !can(access, "subgroups") },
              {
                label: `Link tham gia nhóm · ${link ? "Đang bật" : "Đang tắt"}`,
                icon: <LinkRounded fontSize="small" />,
                onClick: () => setOpen("invite"),
                hidden: !can(access, "links"),
              },
              {
                label: "Xóa nhóm",
                icon: <DeleteOutline fontSize="small" />,
                onClick: () => setOpen("delete"),
                danger: true,
                hidden: !canDelete || access.role !== "owner",
              },
            ]}
          />
        }
      />
      <RenameGroupDialog key={groupName} groupId={groupId} name={groupName} open={open === "rename"} onClose={close} />
      <GroupInviteDialog groupId={groupId} groupName={groupName} link={link} onLinkChange={setLink} open={open === "invite"} onClose={close} />
      {canDelete && access.role === "owner" && (
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
