import { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api";
import { collectKeyword } from "@/services/collector";

export const dynamic = "force-dynamic";
// External APIs can be slow; allow up to 60s on Vercel.
export const maxDuration = 60;

// POST /api/collect/:id — run a fresh collection for one keyword.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await collectKeyword(id);
    return ok(result);
  } catch (error) {
    return handleError(error, "POST /api/collect/:id");
  }
}
