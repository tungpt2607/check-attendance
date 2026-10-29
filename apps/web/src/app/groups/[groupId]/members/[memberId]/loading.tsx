import { PageSkeleton } from "@check-attendance/ui/skeleton";

export default function Loading() {
  return <PageSkeleton narrow cards={[2, 6]} />;
}
