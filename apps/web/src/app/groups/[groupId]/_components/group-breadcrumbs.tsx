// Đường dẫn "← Nhóm của tôi / nhóm cha / …" ở đầu trang nhóm
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import { AppLink } from "@check-attendance/ui/links";

export function GroupBreadcrumbs({ ancestors }: { ancestors: { id: string; name: string }[] }) {
  return (
    // Mọi mục cùng kiểu căn giữa theo chiều dọc để mục có mũi tên không bị nhô lên
    <Breadcrumbs
      sx={{
        mb: 1,
        typography: "body2",
        color: "text.secondary",
        "& .MuiBreadcrumbs-li, & .MuiBreadcrumbs-separator": { display: "inline-flex", alignItems: "center" },
      }}
    >
      <AppLink
        href="/groups"
        color="text.secondary"
        variant="body2"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
      >
        <ArrowBackRounded sx={{ fontSize: 16 }} />
        Nhóm của tôi
      </AppLink>
      {ancestors.map((a) => (
        <AppLink
          key={a.id}
          href={`/groups/${a.id}`}
          color="text.secondary"
          variant="body2"
          sx={{ display: "inline-flex", alignItems: "center" }}
        >
          {a.name}
        </AppLink>
      ))}
    </Breadcrumbs>
  );
}
