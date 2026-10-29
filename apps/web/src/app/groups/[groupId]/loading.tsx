import { TabbedPageSkeleton } from "@check-attendance/ui/skeleton";

export default function Loading() {
  return <TabbedPageSkeleton tabs={3} cards={[5]} />;
}
