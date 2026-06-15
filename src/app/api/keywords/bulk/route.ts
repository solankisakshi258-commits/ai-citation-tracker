import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleError } from "@/lib/api";
import { bulkKeywordSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/keywords/bulk — create many keywords at once.
// Accepts a JSON array of keyword strings (bulk paste or parsed CSV).
// Duplicates (same keyword/country/language) are skipped silently.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Invalid JSON body");

    const input = bulkKeywordSchema.parse(body);
    const country = input.country.toLowerCase();
    const language = input.language.toLowerCase();

    // De-duplicate within the submitted batch.
    const unique = Array.from(
      new Set(
        input.keywords
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
      )
    );

    const result = await prisma.keyword.createMany({
      data: unique.map((keyword) => ({ keyword, country, language })),
      skipDuplicates: true,
    });

    return ok(
      {
        submitted: unique.length,
        created: result.count,
        skipped: unique.length - result.count,
      },
      201
    );
  } catch (error) {
    return handleError(error, "POST /api/keywords/bulk");
  }
}
