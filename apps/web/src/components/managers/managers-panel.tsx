"use client";

// Trang "Người quản lý" của nhóm: chủ nhóm, người quản lý (kể cả người được thêm ở nhóm cha) và các thao tác:
// chủ nhóm: thêm (theo email / link mời), sửa quyền, gỡ, chuyển quyền chủ nhóm · người quản lý: tự rời.
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Fragment, useState } from "react";
import type { GroupManagerRow, GroupManagers, ShareLink } from "@check-attendance/shared/api";
import type { GroupPermission } from "@check-attendance/shared/permissions";
import { ActionMenu } from "@check-attendance/ui/action-menu";
import { ZoomableAvatar } from "@check-attendance/ui/avatar-zoom";
import { AppLink } from "@check-attendance/ui/links";
import { SectionTitle } from "@check-attendance/ui/page-header";
import { TaskDialog } from "@check-attendance/ui/task-dialog";
import {
  addManagerAction,
  createManagerInviteAction,
  removeManagerAction,
  transferOwnerAction,
  updateManagerAction,
} from "@/modules/groups/manager.actions";
import { ShareLinkBox } from "../share-link";
import { PermissionChips, PermissionPicker } from "./permission-picker";

type Props = { groupId: string; groupName: string; data: GroupManagers; myUserId: string };

type Account = GroupManagerRow["account"];

/** Một người trong danh sách: ảnh, tên, email, phần bên dưới và menu thao tác */
function PersonRow({ account, below, menu }: { account: Account; below?: React.ReactNode; menu?: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", py: 1.25 }}>
      <ZoomableAvatar userId={account.id} name={account.name} version={account.avatarVersion} caption={account.email} size={40} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography noWrap sx={{ fontWeight: 600 }}>
          {account.name}
        </Typography>
        <Typography noWrap variant="body2" color="text.secondary">
          {account.email}
        </Typography>
        {below && <Box sx={{ mt: 0.75 }}>{below}</Box>}
      </Box>
      {menu}
    </Box>
  );
}

export function ManagersPanel({ groupId, groupName, data, myUserId }: Props) {
  const isOwner = data.access.role === "owner";
  const [dialog, setDialog] = useState<
    { kind: "add" } | { kind: "edit"; row: GroupManagerRow } | { kind: "remove"; row: GroupManagerRow } | { kind: "transfer" } | null
  >(null);
  const close = () => setDialog(null);
  const direct = data.managers.filter((m) => !m.fromGroup);
  const inherited = data.managers.filter((m) => m.fromGroup);
  const me = direct.find((m) => m.account.id === myUserId);

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <SectionTitle
            extra={
              isOwner && (
                <Button size="small" startIcon={<SwapHorizRounded />} onClick={() => setDialog({ kind: "transfer" })}>
                  Chuyển chủ nhóm
                </Button>
              )
            }
          >
            Chủ nhóm
          </SectionTitle>
          {data.owner && <PersonRow account={data.owner} below={<Chip size="small" color="primary" label="Mọi quyền" />} />}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <SectionTitle
            extra={
              isOwner && (
                <Button size="small" variant="contained" startIcon={<PersonAddAlt1Rounded />} onClick={() => setDialog({ kind: "add" })}>
                  Thêm quản lý
                </Button>
              )
            }
          >
            Người quản lý ({direct.length})
          </SectionTitle>
          {direct.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {isOwner ? "Chưa có ai. Thêm người quản lý và chọn việc họ được làm." : "Chưa có người quản lý nào ở nhóm này."}
            </Typography>
          )}
          {direct.map((m, i) => (
            <Fragment key={m.account.id}>
              {i > 0 && <Divider />}
              <PersonRow
                account={m.account}
                below={<PermissionChips permissions={m.permissions} />}
                menu={
                  <ActionMenu
                    size="small"
                    label={`Thao tác với ${m.account.name}`}
                    actions={[
                      { label: "Sửa quyền", icon: <EditOutlined fontSize="small" />, onClick: () => setDialog({ kind: "edit", row: m }), hidden: !isOwner },
                      {
                        label: m.account.id === myUserId ? "Rời nhóm quản lý" : "Gỡ quản lý",
                        icon: m.account.id === myUserId ? <LogoutRounded fontSize="small" /> : <DeleteOutline fontSize="small" />,
                        onClick: () => setDialog({ kind: "remove", row: m }),
                        danger: true,
                        hidden: !isOwner && m.account.id !== myUserId,
                      },
                    ]}
                  />
                }
              />
            </Fragment>
          ))}
          {me && !isOwner && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Bạn là người quản lý nhóm này. Quyền do chủ nhóm chọn và áp dụng cho cả các nhóm con bên trong.
            </Alert>
          )}
        </CardContent>
      </Card>

      {inherited.length > 0 && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Quản lý từ nhóm cha ({inherited.length})</SectionTitle>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Được thêm ở nhóm cha nên cũng quản lý nhóm này. Sửa hoặc gỡ ở nhóm cha.
            </Typography>
            {inherited.map((m, i) => (
              <Fragment key={`${m.fromGroup!.id}:${m.account.id}`}>
                {i > 0 && <Divider />}
                <PersonRow
                  account={m.account}
                  below={
                    <Stack spacing={0.75}>
                      <PermissionChips permissions={m.permissions} />
                      <Typography variant="caption" color="text.secondary">
                        Từ nhóm <AppLink href={`/groups/${m.fromGroup!.id}/managers`}>{m.fromGroup!.name}</AppLink>
                      </Typography>
                    </Stack>
                  }
                />
              </Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      {dialog?.kind === "add" && <AddManagerDialog groupId={groupId} groupName={groupName} onClose={close} />}
      {dialog?.kind === "edit" && <EditManagerDialog groupId={groupId} row={dialog.row} onClose={close} />}
      {dialog?.kind === "remove" && (
        <TaskDialog
          open
          onClose={close}
          danger
          title={dialog.row.account.id === myUserId ? "Rời nhóm quản lý?" : "Gỡ người quản lý?"}
          confirmLabel={dialog.row.account.id === myUserId ? "Rời" : "Gỡ"}
          successMessage={dialog.row.account.id === myUserId ? "Đã rời nhóm quản lý" : "Đã gỡ người quản lý"}
          onConfirm={() => removeManagerAction(groupId, dialog.row.account.id, dialog.row.account.id === myUserId)}
        >
          <Typography>
            {dialog.row.account.id === myUserId ? (
              <>Bạn sẽ không còn xem và quản lý nhóm <b>{groupName}</b> (cùng các nhóm con) nữa.</>
            ) : (
              <>
                <b>{dialog.row.account.name}</b> sẽ không còn quản lý nhóm <b>{groupName}</b> và các nhóm con.
              </>
            )}
          </Typography>
        </TaskDialog>
      )}
      {dialog?.kind === "transfer" && <TransferDialog groupId={groupId} groupName={groupName} onClose={close} />}
    </Stack>
  );
}

function AddManagerDialog({ groupId, groupName, onClose }: { groupId: string; groupName: string; onClose: () => void }) {
  const [tab, setTab] = useState<"email" | "link">("email");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<GroupPermission[]>(["attendance"]);
  const [link, setLink] = useState<ShareLink | null>(null);

  const confirm = async () => {
    if (tab === "email") return addManagerAction(groupId, email.trim(), permissions);
    const res = await createManagerInviteAction(groupId, permissions);
    if (!res.ok) return res;
    // Giữ hộp thoại mở để hiện link cho chủ nhóm chia sẻ
    setLink(res.link);
    return { ok: true as const, keepOpen: true };
  };

  return (
    <TaskDialog
      open
      onClose={onClose}
      title="Thêm người quản lý"
      fullScreenOnMobile
      confirmLabel={tab === "email" ? "Thêm" : "Tạo link mời"}
      hideConfirm={!!link}
      closeLabel={link ? "Xong" : "Hủy"}
      disabled={tab === "email" && !email.trim()}
      successMessage={tab === "email" ? "Đã thêm người quản lý" : undefined}
      onConfirm={confirm}
    >
      {link ? (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Gửi link này cho người bạn muốn mời. Dùng được <b>1 lần</b>, hết hạn sau 7 ngày. Người nhận đăng nhập (hoặc đăng ký) rồi bấm
            nhận lời.
          </Typography>
          <ShareLinkBox link={link} shareTitle={`Mời làm người quản lý nhóm ${groupName}`} />
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth">
            <Tab value="email" label="Theo email" />
            <Tab value="link" label="Bằng link mời" />
          </Tabs>
          {tab === "email" ? (
            <TextField
              label="Email tài khoản"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="Người này cần đã có tài khoản. Chưa có thì dùng link mời."
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Tạo link mời để gửi qua Zalo, Messenger... Người chưa có tài khoản cũng nhận được (đăng ký rồi nhận lời).
            </Typography>
          )}
          <Box>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Được làm những việc</Typography>
            <PermissionPicker value={permissions} onChange={setPermissions} />
          </Box>
        </Stack>
      )}
    </TaskDialog>
  );
}

function EditManagerDialog({ groupId, row, onClose }: { groupId: string; row: GroupManagerRow; onClose: () => void }) {
  const [permissions, setPermissions] = useState<GroupPermission[]>(row.permissions);
  return (
    <TaskDialog
      open
      onClose={onClose}
      title={`Quyền của ${row.account.name}`}
      fullScreenOnMobile
      confirmLabel="Lưu"
      successMessage="Đã lưu quyền"
      onConfirm={() => updateManagerAction(groupId, row.account.id, permissions)}
    >
      <PermissionPicker value={permissions} onChange={setPermissions} />
    </TaskDialog>
  );
}

function TransferDialog({ groupId, groupName, onClose }: { groupId: string; groupName: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  return (
    <TaskDialog
      open
      onClose={onClose}
      danger
      title="Chuyển quyền chủ nhóm"
      confirmLabel="Chuyển"
      disabled={!email.trim()}
      successMessage="Đã chuyển quyền chủ nhóm"
      onConfirm={() => transferOwnerAction(groupId, email.trim())}
    >
      <Stack spacing={2}>
        <Typography variant="body2">
          Người nhận trở thành chủ nhóm <b>{groupName}</b> (và các nhóm con của bạn bên trong). Bạn ở lại làm người quản lý với mọi quyền,
          nhưng không còn thêm/bớt quản lý hay xóa nhóm được nữa.
        </Typography>
        <TextField label="Email chủ nhóm mới" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Stack>
    </TaskDialog>
  );
}
