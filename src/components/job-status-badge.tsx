import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/types";

const MAP: Record<
  JobStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  RUNNING: { label: "Running", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, variant } = MAP[status] ?? MAP.PENDING;
  return <Badge variant={variant}>{label}</Badge>;
}
