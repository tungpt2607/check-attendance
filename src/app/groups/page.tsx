import AddRounded from "@mui/icons-material/AddRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
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
import { brand } from "@/theme/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhóm của tôi · Điểm danh" };

function countAll(nodes: GroupTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.children), 0);
}

/** Cây nhóm nhiều cấp: mỗi cấp con thụt vào và có đường kẻ dọc */
function GroupTree({ nodes, depth = 0 }: { nodes: GroupTreeNode[]; depth?: number }) {
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
              secondary={`${node.memberCount} thành viên${node.children.length > 0 ? ` · ${node.children.length} nhóm con` : ""}`}
              slotProps={{ primary: { fontWeight: 600 } }}
            />
            <ChevronRightRounded sx={{ color: "text.disabled" }} />
          </ListLink>
          {node.children.length > 0 && <GroupTree nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </List>
  );
}

export default async function GroupsPage() {
  const user = await requireUser();
  const tree = await getOwnedGroupTree(user.userId);

  return (
    <>
      <PageHeader
        title="Nhóm của tôi"
        subtitle={tree.length === 0 ? "Bạn chưa có nhóm nào." : `${countAll(tree)} nhóm`}
      />

      <Stack spacing={2}>
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
              <SectionTitle>Danh sách nhóm</SectionTitle>
              <GroupTree nodes={tree} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </>
  );
}
