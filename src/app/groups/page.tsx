import AddRounded from "@mui/icons-material/AddRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import HowToRegOutlined from "@mui/icons-material/HowToRegOutlined";
import LinkRounded from "@mui/icons-material/LinkRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ListLink } from "@/components/links";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/session";
import { createGroupAction } from "@/modules/groups/group.actions";
import { getOwnedGroupTree, type GroupTreeNode } from "@/modules/groups/group.service";
import { getGroupsWithActiveInvite } from "@/modules/invites/invite.service";
import { listMembershipsOfUser } from "@/modules/members/membership.service";
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhóm của tôi · Điểm danh" };

function countAll(nodes: GroupTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.children), 0);
}

/** Cây nhóm nhiều cấp: mỗi cấp con thụt vào và có đường kẻ dọc */
/** Tất cả mã nhóm trong cây */
function allIds(nodes: GroupTreeNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...allIds(n.children)]);
}

function GroupTree({ nodes, depth = 0, linkOn }: { nodes: GroupTreeNode[]; depth?: number; linkOn: Set<string> }) {
  return (
    <List
      disablePadding
      sx={depth === 0 ? { mx: -1 } : { ml: 2.5, pl: 1, borderLeft: `2px solid ${brand.border}` }}
    >
      {nodes.map((node) => (
        <li key={node.id}>
          <ListLink href={`/groups/${node.id}`} sx={{ borderRadius: 2, px: 1, py: 1 }}>
            <FolderOutlined fontSize="small" sx={{ color: depth === 0 ? brand.tealDark : "text.disabled", mr: 1.5 }} />
            <ListItemText
              primary={node.name}
              secondary={
                <>
                  {`${node.memberCount} thành viên${node.children.length > 0 ? ` · ${node.children.length} nhóm con` : ""}`}
                  {linkOn.has(node.id) && (
                    <Box
                      component="span"
                      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, ml: 1, color: brand.tealDark, fontWeight: 500, verticalAlign: "bottom" }}
                    >
                      <LinkRounded sx={{ fontSize: 16 }} />
                      Link tham gia đang bật
                    </Box>
                  )}
                </>
              }
              slotProps={{ primary: { fontWeight: 600 } }}
            />
            <ChevronRightRounded sx={{ color: "text.disabled" }} />
          </ListLink>
          {node.children.length > 0 && <GroupTree nodes={node.children} depth={depth + 1} linkOn={linkOn} />}
        </li>
      ))}
    </List>
  );
}

export default async function GroupsPage() {
  const user = await requireUser();
  const [tree, memberships] = await Promise.all([getOwnedGroupTree(user.userId), listMembershipsOfUser(user.userId)]);
  // Nhóm nào đang bật link tham gia (để hiện nhãn ngoài danh sách)
  const linkOn = await getGroupsWithActiveInvite(allIds(tree));

  return (
    <>
      <PageHeader
        title="Nhóm của tôi"
        subtitle={
          tree.length === 0 && memberships.length === 0
            ? "Bạn chưa có nhóm nào."
            : [tree.length > 0 && `Quản lý ${countAll(tree)} nhóm`, memberships.length > 0 && `tham gia ${memberships.length} nhóm`]
                .filter(Boolean)
                .join(" · ")
        }
      />

      <Stack spacing={2}>
        {/* Nhóm mà tài khoản đã liên kết làm thành viên */}
        {memberships.length > 0 && (
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Nhóm tôi tham gia</SectionTitle>
              <List disablePadding sx={{ mx: -1 }}>
                {memberships.map((m) => (
                  <ListLink key={m.memberId} href={`/me/${m.memberId}`} sx={{ borderRadius: 2, px: 1, py: 1 }}>
                    <HowToRegOutlined fontSize="small" sx={{ color: brand.tealDark, mr: 1.5 }} />
                    <ListItemText
                      primary={m.groupName}
                      secondary={`Bạn là ${m.memberName}`}
                      slotProps={{ primary: { fontWeight: 600 } }}
                    />
                    <ChevronRightRounded sx={{ color: "text.disabled" }} />
                  </ListLink>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <SectionTitle>Tạo nhóm mới</SectionTitle>
            <form action={createGroupAction}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField name="name" label="Tên nhóm" placeholder="Lớp 10A1, Công ty ABC..." required />
                <SubmitButton
                  pendingText="Đang tạo..."
                  startIcon={<AddRounded />}
                  successMessage="Đã tạo nhóm"
                  sx={{ flexShrink: 0, height: 40 }}
                >
                  Tạo nhóm
                </SubmitButton>
              </Stack>
            </form>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Nhóm con (phòng ban, tổ, đội...) được tạo bên trong từng nhóm.
            </Typography>
          </CardContent>
        </Card>

        {tree.length > 0 && (
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <SectionTitle>Nhóm tôi quản lý</SectionTitle>
              <GroupTree nodes={tree} linkOn={linkOn} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </>
  );
}
