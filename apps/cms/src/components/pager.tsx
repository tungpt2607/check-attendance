// Phân trang bằng link (?page=), giữ các tham số khác (q, action...)
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LinkButton } from "@check-attendance/ui/links";

type Props = {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
};

function href(basePath: string, params: Props["params"], page: number) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
  if (page > 1) q.set("page", String(page));
  return q.size ? `${basePath}?${q}` : basePath;
}

export function Pager({ basePath, params, page, pageSize, total }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {total === 0 ? "Không có kết quả" : `${from}–${to} / ${total}`}
      </Typography>
      {pages > 1 && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <LinkButton
            href={href(basePath, params, page - 1)}
            variant="outlined"
            color="inherit"
            size="small"
            disabled={page <= 1}
            startIcon={<ChevronLeftRounded />}
          >
            Trước
          </LinkButton>
          <LinkButton
            href={href(basePath, params, page + 1)}
            variant="outlined"
            color="inherit"
            size="small"
            disabled={page >= pages}
            endIcon={<ChevronRightRounded />}
          >
            Sau
          </LinkButton>
        </Box>
      )}
    </Box>
  );
}
