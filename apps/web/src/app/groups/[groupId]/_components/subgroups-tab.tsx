// Tab "Nhóm con" của trang nhóm: danh sách nhóm con kèm % chuyên cần chung + nút tạo nhóm con
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import SubdirectoryArrowRightRounded from "@mui/icons-material/SubdirectoryArrowRightRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import type { GroupDetail } from "@check-attendance/shared/api";
import { CreateSubgroupButton } from "@/components/group-create-buttons";
import { ListLink } from "@check-attendance/ui/links";
import { SectionTitle } from "@check-attendance/ui/page-header";
import { RateBadge } from "@/components/rate";

export function SubgroupsTab({ groupId, subgroups }: { groupId: string; subgroups: GroupDetail["children"] }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <SectionTitle extra={<CreateSubgroupButton parentId={groupId} />}>Nhóm con ({subgroups.length})</SectionTitle>
        {subgroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Chưa có nhóm con.
          </Typography>
        ) : (
          <List disablePadding sx={{ mx: -1 }}>
            {subgroups.map((c) => {
              const st = c.stats;
              return (
                <ListLink key={c.id} href={`/groups/${c.id}`} sx={{ borderRadius: 2, px: 1 }}>
                  <SubdirectoryArrowRightRounded fontSize="small" sx={{ color: "text.disabled", mr: 1 }} />
                  <ListItemText
                    primary={c.name}
                    secondary={st ? `${st.memberCount} thành viên · ${st.sessionCount} buổi` : undefined}
                    slotProps={{ primary: { fontWeight: 500 } }}
                  />
                  <RateBadge rate={st?.rate ?? null} title="Chuyên cần chung của nhóm con này" />
                  <ChevronRightRounded sx={{ color: "text.disabled", ml: 0.5 }} />
                </ListLink>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
