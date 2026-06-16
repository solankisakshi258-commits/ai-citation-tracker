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

  // Distinct cited domains (a domain may be cited via multiple URLs).
  const citedDomains = Array.from(
    new Set(citations.map((c) => c.citationDomain))
  ).sort();

  // Organic "Top 10" for the dedicated section (we store more for the
  // comparison table; this view focuses on the traditional top 10).
  const organicTop10 = organicRankings.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* ───────── 1. AI OVERVIEW TEXT (full response) ───────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>1. AI Overview Text</CardTitle>
            {present ? (
              <Badge variant="success">Present</Badge>
            ) : (
              <Badge variant="outline">Not present</Badge>
            )}
          </div>
          <CardDescription>
            Full AI Overview response.{" "}
            {aiOverview ? `Collected ${formatDate(aiOverview.createdAt)}.` : ""}
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

      {/* ───────── 2. CITATIONS — all cited domains ───────── */}
      <Card>
        <CardHeader>
          <CardTitle>2. Citations — Cited Domains ({citedDomains.length})</CardTitle>
          <CardDescription>
            Every distinct domain cited inside the AI Overview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {citedDomains.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No cited domains.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {citedDomains.map((d) => (
                <Badge key={d} variant="secondary" className="text-sm">
                  {d}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────── 3. URLs — all cited URLs ───────── */}
      <Card>
        <CardHeader>
          <CardTitle>3. Citation URLs ({citations.length})</CardTitle>
          <CardDescription>
            Every URL cited inside the AI Overview, with its domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {citations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No citation URLs.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Domain</TableHead>
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

      {/* ───────── 4. ORGANIC TOP 10 — traditional rankings ───────── */}
      <Card>
        <CardHeader>
          <CardTitle>4. Organic Top 10</CardTitle>
          <CardDescription>
            Traditional organic ranking results
            {organicRankings.length > 10
              ? ` (showing top 10 of ${organicRankings.length} stored)`
              : ""}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organicTop10.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No organic rankings.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-48">Domain</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organicTop10.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums font-medium">
                      {r.position}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.domain}
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
                      <div className="text-xs text-muted-foreground break-all">
                        {r.url}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Comparison table — bridges the four blocks for the next module */}
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
    </div>
  );
}
