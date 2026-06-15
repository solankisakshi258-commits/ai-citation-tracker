import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleError } from "@/lib/api";
import { createKeywordSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/keywords — list all keywords with collection counts.
export async function GET() {
  try {
    const keywords = await prisma.keyword.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { citations: true, organicRankings: true },
        },
        aiOverviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { aiOverviewPresent: true, createdAt: true },
        },
      },
    });

    const data = keywords.map((k) => ({
      id: k.id,
      keyword: k.keyword,
      location: k.location,
      createdAt: k.createdAt,
      citationCount: k._count.citations,
      organicCount: k._count.organicRankings,
      aiOverviewPresent: k.aiOverviews[0]?.aiOverviewPresent ?? null,
      lastCollectedAt: k.aiOverviews[0]?.createdAt ?? null,
    }));

    return ok(data);
  } catch (error) {
    return handleError(error, "GET /api/keywords");
  }
}

// POST /api/keywords — create a single keyword.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Invalid JSON body");

    const input = createKeywordSchema.parse(body);

    const keyword = await prisma.keyword.create({
      data: {
        keyword: input.keyword,
        location: input.location,
      },
    });

    return ok(keyword, 201);
  } catch (error) {
    return handleError(error, "POST /api/keywords");
  }
}
