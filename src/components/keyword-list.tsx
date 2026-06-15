"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectButton } from "@/components/collect-button";
import { formatDate } from "@/lib/utils";

export interface KeywordRow {
  id: string;
  keyword: string;
  location: string;
  createdAt: string;
  citationCount: number;
  organicCount: number;
  aiOverviewPresent: boolean | null;
  lastCollectedAt: string | null;
}

function AiBadge({ present }: { present: boolean | null }) {
  if (present === null) return <Badge variant="secondary">Not collected</Badge>;
  return present ? (
    <Badge variant="success">Yes</Badge>
  ) : (
    <Badge variant="outline">No</Badge>
  );
}

export function KeywordList({ rows }: { rows: KeywordRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function remove(id: string, keyword: string) {
    if (!confirm(`Delete "${keyword}" and all its collected data?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/keyword/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Failed to delete keyword.");
    } finally {
      setDeletingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No keywords yet. Add your first keyword above.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead className="w-40">Location</TableHead>
          <TableHead className="w-28">AI Overview</TableHead>
          <TableHead className="w-24 text-right">Citations</TableHead>
          <TableHead className="w-24 text-right">Organic</TableHead>
          <TableHead className="w-40">Last Collected</TableHead>
          <TableHead className="w-44 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link
                href={`/keyword/${row.id}`}
                className="font-medium hover:underline"
              >
                {row.keyword}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.location}
            </TableCell>
            <TableCell>
              <AiBadge present={row.aiOverviewPresent} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.citationCount}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.organicCount}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.lastCollectedAt ? formatDate(row.lastCollectedAt) : "—"}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <CollectButton keywordId={row.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={deletingId === row.id}
                  onClick={() => remove(row.id, row.keyword)}
                >
                  {deletingId === row.id ? "…" : "Delete"}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
