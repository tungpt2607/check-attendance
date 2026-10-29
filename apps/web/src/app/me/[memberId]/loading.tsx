import { TabbedPageSkeleton } from "@check-attendance/ui/skeleton";

export default function Loading() {
  return <TabbedPageSkeleton narrow before={[2]} tabs={2} cards={[5]} />;
}
