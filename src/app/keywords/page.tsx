import { prisma } from "@/lib/prisma";
import { KeywordForm } from "@/components/keyword-form";
import { KeywordList, type KeywordRow } from "@/components/keyword-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getKeywordRows(): Promise<KeywordRow[]> {
  const keywords = await prisma.keyword.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { citations: true, organicRankings: true } },
      aiOverviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { aiOverviewPresent: true, createdAt: true },
      },
    },
  });

  return keywords.map((k) => ({
    id: k.id,
    keyword: k.keyword,
    location: k.location,
    createdAt: k.createdAt.toISOString(),
    citationCount: k._count.citations,
    organicCount: k._count.organicRankings,
    aiOverviewPresent: k.aiOverviews[0]?.aiOverviewPresent ?? null,
    lastCollectedAt: k.aiOverviews[0]?.createdAt.toISOString() ?? null,
  }));
}

export default async function KeywordsPage() {
  const rows = await getKeywordRows();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Keywords</h1>
        <p className="text-sm text-muted-foreground">
          Manage tracked keywords and run data collection.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <KeywordForm />

        <Card>
          <CardHeader>
            <CardTitle>Tracked Keywords ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <KeywordList rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
