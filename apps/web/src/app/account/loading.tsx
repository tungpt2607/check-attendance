import { PageSkeleton } from "@check-attendance/ui/skeleton";

export default function Loading() {
  return <PageSkeleton narrow cards={[1, 1, 1, 3]} />;
}
