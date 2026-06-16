import Link from "next/link";
import { notFound } from "next/navigation";
import { getKeywordDetail } from "@/lib/queries";
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
import { Badge } from "@/components/ui/badge";
import { ComparisonTable } from "@/components/comparison-table";
import { CollectButton } from "@/components/collect-button";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KeywordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getKeywordDetail(id);
  if (!detail) notFound();

  const { keyword, aiOverview, citations, organicRankings, comparison, latestJob } =
    detail;
  const present = aiOverview?.aiOverviewPresent ?? false;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/keywords"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to keywords
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {keyword.keyword}
          </h1>
          <p className="text-sm text-muted-foreground">{keyword.location}</p>
        </div>
        <div className="flex items-center gap-3">
          {latestJob && (
            <div className="text-right text-xs text-muted-foreground">
              <div className="mb-1">
                <JobStatusBadge status={latestJob.status} />
              </div>
              Last run: {formatDate(latestJob.completedAt ?? latestJob.createdAt)}
            </div>
          )}
          <CollectButton
            keywordId={keyword.id}
            size="default"
            variant="default"
            label="Run Collection"
          />
        </div>
      </div>

      {latestJob?.error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">
            {latestJob.status === "FAILED"
              ? "Last collection failed: "
              : "Last collection completed with a warning: "}
            {latestJob.error}
          </CardContent>
        </Card>
      )}

      {/* AI Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI Overview</CardTitle>
            {present ? (
              <Badge variant="success">Present</Badge>
            ) : (
              <Badge variant="outline">Not present</Badge>
            )}
          </div>
          <CardDescription>
            {aiOverview
              ? `Collected ${formatDate(aiOverview.createdAt)}`
              : "Not collected yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {present && aiOverview?.overviewText ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {aiOverview.overviewText}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {present
                ? "AI Overview present but no text was returned."
                : "No AI Overview for this keyword."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comparison table — the core deliverable */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison: Organic Rank vs. AI Citation</CardTitle>
          <CardDescription>
            Domains that rank organically and/or are cited by the AI Overview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonTable rows={comparison} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Citations */}
        <Card>
          <CardHeader>
            <CardTitle>Citation Sources ({citations.length})</CardTitle>
            <CardDescription>URLs cited inside the AI Overview.</CardDescription>
          </CardHeader>
          <CardContent>
            {citations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No citations.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Domain</TableHead>
                    <TableHead>URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.citationDomain}
                      </TableCell>
                      <TableCell>
                        <a
                          href={c.citationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {c.citationUrl}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Organic rankings */}
        <Card>
          <CardHeader>
            <CardTitle>Organic Rankings ({organicRankings.length})</CardTitle>
            <CardDescription>Top organic SERP results.</CardDescription>
          </CardHeader>
          <CardContent>
            {organicRankings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No organic rankings.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organicRankings.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {r.position}
                      </TableCell>
                      <TableCell>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {r.title}
                        </a>
                        <div className="text-xs text-muted-foreground">
                          {r.domain}
                        </div>
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
