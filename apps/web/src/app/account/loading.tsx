import { PageSkeleton } from "@/components/skeleton";

export default function Loading() {
  return <PageSkeleton narrow cards={[1, 1, 1, 3]} />;
}
