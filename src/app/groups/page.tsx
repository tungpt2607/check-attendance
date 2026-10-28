import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { createGroupAction } from "@/modules/groups/group.actions";
import { getOwnedGroupTree, type GroupTreeNode } from "@/modules/groups/group.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhóm của tôi · Điểm danh" };

function countAll(nodes: GroupTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.children), 0);
}

function GroupTree({ nodes, depth = 0 }: { nodes: GroupTreeNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1 border-l border-slate-200 pl-4"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/groups/${node.id}`}
            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            <span className="font-medium text-slate-800">
              {depth > 0 && <span className="mr-1 text-slate-400">↳</span>}
              {node.name}
            </span>
            <span className="text-xs text-slate-500">
              {node.memberCount} thành viên
              {node.children.length > 0 && ` · ${node.children.length} nhóm con`}
            </span>
          </Link>
          {node.children.length > 0 && <GroupTree nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default async function GroupsPage() {
  const user = await requireUser();
  const tree = await getOwnedGroupTree(user.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nhóm của tôi</h1>
        <p className={ui.muted}>
          {tree.length === 0 ? "Bạn chưa có nhóm nào." : `${countAll(tree)} nhóm`}
        </p>
      </div>

      <div className={ui.card}>
        <h2 className={`${ui.h2} mb-3`}>Tạo nhóm mới</h2>
        <form action={createGroupAction} className="flex flex-col gap-2 sm:flex-row">
          <input name="name" required placeholder="Ví dụ: Lớp 10A1, Công ty ABC..." className={ui.input} />
          <SubmitButton pendingText="Đang tạo..." className="shrink-0">Tạo nhóm</SubmitButton>
        </form>
        <p className={`${ui.muted} mt-2`}>Nhóm con (phòng ban, tổ, đội...) được tạo bên trong từng nhóm.</p>
      </div>

      {tree.length > 0 && (
        <div className={ui.card}>
          <h2 className={`${ui.h2} mb-2`}>Danh sách nhóm</h2>
          <GroupTree nodes={tree} />
        </div>
      )}
    </div>
  );
}
