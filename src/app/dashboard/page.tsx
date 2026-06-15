import Link from "next/link";
import { getDashboardStats } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAT_CARDS = [
  { key: "totalKeywords", label: "Total Keywords" },
  { key: "totalAiOverviews", label: "Total AI Overviews" },
  { key: "totalCitations", label: "Total Citations" },
  { key: "totalCitationDomains", label: "Total Citation Domains" },
] as const;

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Google AI Overview citations vs. organic rankings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <Card key={card.key}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {stats[card.key].toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Keywords</CardTitle>
            <CardDescription>Latest keywords added.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentKeywords.length === 0 ? (
              <EmptyRow message="No keywords yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="w-40">Location</TableHead>
                    <TableHead className="w-40">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentKeywords.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <Link
                          href={`/keyword/${k.id}`}
                          className="font-medium hover:underline"
                        >
                          {k.keyword}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {k.location}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(k.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Collections</CardTitle>
            <CardDescription>Latest data-collection runs.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCollections.length === 0 ? (
              <EmptyRow message="No collection runs yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-40">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentCollections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/keyword/${c.keywordId}`}
                          className="font-medium hover:underline"
                        >
                          {c.keyword}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(c.completedAt ?? c.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
  );
}
