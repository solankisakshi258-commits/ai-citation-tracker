import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ComparisonRow } from "@/types";

/**
 * Domain-by-domain comparison of organic rank vs. AI Overview citation.
 * This is the core deliverable of Module 1.
 */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No data collected yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          <TableHead className="w-32 text-right">Organic Rank</TableHead>
          <TableHead className="w-32 text-center">AI Citation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.domain}>
            <TableCell className="font-medium">{row.domain}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.organicRank ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {row.aiCitation ? (
                <Badge variant="success">Yes</Badge>
              ) : (
                <Badge variant="outline">No</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
