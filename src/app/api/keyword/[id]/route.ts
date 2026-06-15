import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleError } from "@/lib/api";
import { getKeywordDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET /api/keyword/:id — full detail incl. comparison table.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getKeywordDetail(id);
    if (!detail) return fail("Keyword not found", 404);
    return ok(detail);
  } catch (error) {
    return handleError(error, "GET /api/keyword/:id");
  }
}

// DELETE /api/keyword/:id — remove a keyword and all its collected data.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.keyword.delete({ where: { id } });
    return ok({ id, deleted: true });
  } catch (error) {
    return handleError(error, "DELETE /api/keyword/:id");
  }
}
